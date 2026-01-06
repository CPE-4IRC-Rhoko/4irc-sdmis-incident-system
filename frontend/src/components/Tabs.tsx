import './Tabs.css'

interface Onglet {
  id: string
  label: string
}

interface Props {
  onglets: Onglet[]
  actif: string
  onChange: (id: string) => void
}

function Tabs({ onglets, actif, onChange }: Props) {
  return (
    <div className="tabs">
      {onglets.map((onglet) => (
        <button
          key={onglet.id}
          className={`tab ${actif === onglet.id ? 'tab-active' : ''}`}
          onClick={() => onChange(onglet.id)}
          type="button"
        >
          {onglet.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs
