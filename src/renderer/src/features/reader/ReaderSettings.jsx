import { useSettings } from '../../store/useSettings'
import { READER_THEMES, READER_FONTS } from '@shared/reader-themes'
import Icon from '../../components/Icon'

function Range({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <div className="setting">
      <label>
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </label>
      <div className="range-row">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  )
}

export default function ReaderSettings({ onClose }) {
  const reader = useSettings((s) => s.settings.reader)
  const update = useSettings((s) => s.updateReader)

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <h3>Reading settings</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="drawer-body">
          <div className="setting">
            <label><span>Theme</span></label>
            <div className="theme-swatches">
              {Object.entries(READER_THEMES).map(([key, t]) => (
                <button
                  key={key}
                  className={reader.theme === key ? 'active' : ''}
                  style={{ background: t.bg, color: t.fg }}
                  onClick={() => update({ theme: key })}
                >
                  {t.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="setting">
            <label><span>Custom colors</span></label>
            <div className="color-row">
              <label>
                Background
                <input
                  type="color"
                  value={reader.bgColor || READER_THEMES[reader.theme]?.bg || '#ffffff'}
                  onChange={(e) => update({ theme: 'custom', bgColor: e.target.value, textColor: reader.textColor || READER_THEMES[reader.theme]?.fg })}
                />
              </label>
              <label>
                Text
                <input
                  type="color"
                  value={reader.textColor || READER_THEMES[reader.theme]?.fg || '#000000'}
                  onChange={(e) => update({ theme: 'custom', textColor: e.target.value, bgColor: reader.bgColor || READER_THEMES[reader.theme]?.bg })}
                />
              </label>
            </div>
          </div>

          <div className="setting">
            <label><span>Font</span></label>
            <select className="select" value={reader.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })}>
              {READER_FONTS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <Range label="Font size" value={reader.fontSize} min={14} max={30} suffix="px" onChange={(v) => update({ fontSize: v })} />
          <Range label="Line spacing" value={reader.lineHeight} min={1.3} max={2.2} step={0.05} onChange={(v) => update({ lineHeight: v })} />
          <Range label="Letter spacing" value={reader.letterSpacing} min={0} max={2} step={0.1} suffix="px" onChange={(v) => update({ letterSpacing: v })} />
          <Range label="Text width" value={reader.maxWidth} min={520} max={980} step={20} suffix="px" onChange={(v) => update({ maxWidth: v })} />
          <Range label="Side margin" value={reader.margin} min={12} max={80} suffix="px" onChange={(v) => update({ margin: v })} />
        </div>
      </div>
    </>
  )
}
