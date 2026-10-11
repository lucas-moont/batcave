# What Bat-Signal reads and writes

Bat-Signal has no data of its own about your sessions. It reads what Claude Code already writes to `~/.claude/`, and, with the [plugin](plugin.md), the hook events Claude Code sends it. This page lists every file it opens, which fields it uses, and what it never touches. The examples are made up, from the test fixtures in `app/test/fixtures/lines.ts`.

None of these formats is a public Claude Code contract. Bat-Signal reads them defensively: a field it does not find is skipped, never an error.

## `~/.claude/sessions/<pid>.json`: the live sessions

One small JSON file per running Claude Code process. Claude Code rewrites it on every status change and removes it when the session ends.

```json
{"pid":4242,"sessionId":"00000000-0000-4000-8000-000000000001","cwd":"/home/bruce/wayne-enterprises","procStart":"134355583899737171","status":"idle","name":"wayne-enterprises-1","startedAt":1767225600000}
```

- **Used:** `pid`, `sessionId` and `cwd` (all three required, or the file is skipped), `procStart`, `status`, `name`, `startedAt`. Every other field is ignored.
- `status` is `busy`, `idle` or `shell`; anything else counts as `idle`.
- **How:** the folder is watched (`fs.watch`, debounced 150 ms) and also scanned every 5 seconds, because a watch can miss events or start before the folder exists (`app/src/main/sources/sessionRegistry.ts`).
- **Is it alive?** A crashed session leaves its file behind, and Windows reuses pids. A session counts only if its pid runs and, when `procStart` is present, the process started at that time. Start times come from one PowerShell `Get-Process` call per batch (`app/src/main/sources/windowsProbe.ts`).
- **Bad data:** a file read halfway through a rewrite does not parse. Bat-Signal then keeps the last version of that file that did, so the session does not blink out. If the PowerShell lookup fails, the last known list stays.

## `~/.claude/projects/<folder>/<sessionId>.jsonl`: the transcripts

One JSON object per line, appended as the conversation goes. `<folder>` is the session's `cwd` with every character that is not a letter or digit turned into `-` (`/home/bruce/wayne-enterprises` becomes `-home-bruce-wayne-enterprises`). Long paths get shortened names, so when that folder has no transcript Bat-Signal looks in every project folder, at most once every 30 seconds per session (`app/src/main/sources/transcriptLocator.ts`, `DEEP_SCAN_EVERY_MS` in `app/src/main/store.ts`).

Lines it uses, by `type` (`app/src/main/model/sessionReducer.ts`):

| `type` | Fields used | For |
|---|---|---|
| `custom-title`, `ai-title` | `customTitle`, `aiTitle` | The case title (a custom one wins) |
| `user`, `assistant` | `timestamp`, `cwd`, `message.content`, `toolUseResult`; lines with `isMeta: true` are skipped | Last words, last activity, tasks, subagents, background commands |
| `queue-operation` | `operation: "enqueue"`, `content`, `timestamp` | `<task-notification>` that ends a subagent or a background command |

Every other line type is ignored. Inside `message.content` only three block kinds count: `text`, `tool_use` (`id`, `name`, `input`) and `tool_result` (`tool_use_id`, `is_error`). Thinking blocks and the text of tool results are never read. Tool calls are followed for five tools only, `TaskCreate`, `TaskUpdate`, `Agent`, `Bash` (for `backgroundTaskId`) and `TaskStop`; the rest are passed over.

```json
{"type":"ai-title","aiTitle":"Tune the Batmobile","sessionId":"00000000-0000-4000-8000-000000000001"}
{"type":"user","message":{"role":"user","content":"Check the brakes before tonight"},"cwd":"/home/bruce/wayne-enterprises","timestamp":"2026-01-01T00:00:01.000Z"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_01","name":"TaskCreate","input":{"subject":"Check the brakes"}}]},"timestamp":"2026-01-01T00:00:02.000Z"}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01","content":"ok"}]},"toolUseResult":{"task":{"id":"1","subject":"Check the brakes"}},"timestamp":"2026-01-01T00:00:03.000Z"}
```

(Claude Code writes more fields on each line, such as `uuid`; Bat-Signal ignores them, so they are left out here.)

- **How:** tailed (`app/src/main/sources/transcriptTailer.ts`). Bat-Signal remembers how far it read and reads only what was appended, in 1 MB chunks, so a long transcript is never held in memory whole. Every live transcript is re-read every 2 seconds (`REFRESH_MS` in `app/src/main/batSignal.ts`), and once more 300 ms after each hook, since a hook can fire before its line is written.
- **Bad data:** only complete lines are read; a half-written last line waits for the next read. A line that is not JSON is skipped and the rest still count. If the file shrinks or is replaced (another inode or creation time), Bat-Signal reads it again from the start and rebuilds that session. A missing file is not an error.

## Subagent transcripts

Next to a transcript, `<sessionId>/subagents/agent-<agentId>.jsonl` holds each subagent's own conversation, and `agent-<agentId>.meta.json` links it to the `Agent` call that started it.

```json
{"toolUseId":"toolu_02"}
```

- **Used:** from the meta file only `toolUseId`; from the transcript only the `text` blocks of `assistant` lines, for the subagent's latest word.
- **How:** tailed like the main transcript while the subagent runs, then read to the end once and left alone.
- **Bad data:** a missing or broken meta file links the subagent by its agent id alone.

## Hook events (with the plugin)

Each hook arrives as a JSON `POST` on `127.0.0.1:47777`, sent by the plugin's background `curl.exe` (see [plugin.md](plugin.md)). Bat-Signal uses `session_id`, `hook_event_name`, and, by event, `tool_name`, `tool_input`, `tool_use_id`, `notification_type` and `error_type` (`app/src/main/model/hookSignals.ts`). Of `tool_input` it keeps one field (the command, file path, notebook path, URL, pattern, query, description or prompt, in that order: `DETAIL_FIELDS` in `hookSignals.ts`), squeezed to one line of at most 120 characters. Everything else in the payload, including the prompt text of `UserPromptSubmit` and `transcript_path`, is ignored.

```json
{"session_id":"00000000-0000-4000-8000-000000000001","hook_event_name":"PermissionRequest","tool_name":"Bash","tool_input":{"command":"npm test"},"tool_use_id":"toolu_03"}
```

## Never read

- **`~/.claude/sessions/*.key`.** These hold secrets. The registry lists the folder and keeps only names matching `^\d+\.json$` before it opens anything (`ENTRY_FILE` in `app/src/main/sources/sessionRegistry.ts`).
- **Anything else under `~/.claude/`.** Bat-Signal joins exactly two folders onto it, `sessions` and `projects` (`startBatSignal` in `app/src/main/batSignal.ts`). Settings, credentials, history and todos are never opened.
- **The text of tool results and thinking blocks**, as above.

What it does show from a transcript: the last 4 messages of a case (it keeps the last 20, `MAX_MESSAGES` in `sessionReducer.ts`), skipping user text that starts with a `<tag>`, which Claude Code writes itself for commands and reminders; task subjects and descriptions; a subagent's description, prompt, latest word and summary; a background command and its description. Toasts and notice cards carry the case title (its custom or AI title, or the session name) and one line: a tool name with its one-line detail, an error type, a task subject or a folder name. Never message text. All of this lives in memory and is dropped when the session ends. Nothing from `~/.claude/` is written to disk or sent anywhere.

## What Bat-Signal writes

- **Its settings folder:** `%APPDATA%\Bat-Signal` for the installed app, `%APPDATA%\Bat-Signal Dev` for a development run (set in `app/src/main/index.ts`), unless `--user-data-dir` names another. In it, `settings.json` (switches, the Theme, layout, shortcut, which news becomes a toast or a sound) and `window.json` (the corner the windows hang from, the panel size, panel or watch strip), plus the profile folders Electron keeps there. A missing or broken file falls back to the defaults (`app/src/main/jsonFile.ts`).
- **On first run only:** if that folder has neither file yet, it copies both from the folder before it, `%APPDATA%\batcave` for the installed app (its old name) or `%APPDATA%\Bat-Signal` for a development run (`app/src/main/userData.ts`). The old folder is left as it was.
- **Start with Windows:** when switched on, Electron adds a value to `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`, named `com.lucasmoont.bat-signal` (`.dev` in development), that starts the app with `--hidden`, and marks it approved in Task Manager's `StartupApproved\Run`. Bat-Signal's own code only reads that value, with `reg query`, to show whether Task Manager turned the entry off (`app/src/main/startup.ts`).
- **The clipboard:** when a session's terminal cannot be found, "go to terminal" copies `claude --resume <sessionId>`.

It never writes under `~/.claude/`.

## Network

Bat-Signal listens on `127.0.0.1:47777` and nowhere else (`app/src/main/sources/hookServer.ts`). It opens no outgoing connection: the main process has no HTTP client, there is no auto-update (the installer is built with `--publish never`), and the window's Content Security Policy allows connections only to the app's own files (`default-src 'self'` in `app/src/renderer/index.html`).

Only one process can hold the port. When the installed app and a development run are both open, the first one started gets the hooks; the other works from the files alone.
