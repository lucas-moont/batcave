// Shown on Needs you while the plugin is not reaching some sessions: an empty list there must never
// read as "nothing needs you" when Bat-Signal simply cannot hear their permission prompts or waits.
import { PLUGIN_INSTALL } from '@shared/words'
import { useWords } from '../words'

export function PluginHint({ sessions }: { sessions: number }) {
  const say = useWords().voice.pluginHint
  return (
    <aside className="plugin-hint" role="note">
      <p className="plugin-hint__title">{say.title(sessions)}</p>
      <p className="plugin-hint__text">{say.text}</p>
      <code className="plugin-hint__command">{PLUGIN_INSTALL}</code>
    </aside>
  )
}
