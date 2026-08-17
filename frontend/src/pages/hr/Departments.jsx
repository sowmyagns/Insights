import { useState, useEffect } from 'react'
import { api } from '../api'
import './Departments.css'

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.departments.list()
      setDepartments(data)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => load(), [])

  const openCreate = () => {
    setForm({ name: '', description: '' })
    setModal('create')
  }

  const openEdit = (d) => {
    setForm({ name: d.name, description: d.description || '' })
    setModal({ type: 'edit', id: d.id })
  }

  const save = async () => {
    try {
      if (modal === 'create') {
        await api.departments.create(form)
      } else {
        await api.departments.update(modal.id, form)
      }
      setModal(null)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this department?')) return
    try {
      await api.departments.delete(id)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  if (loading) return <div className="page-loading">Loading departments...</div>

  return (
    <div className="departments">
      <div className="page-header">
        <h1>Departments</h1>
        <button className="btn-primary" onClick={openCreate}>+ Add Department</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.description || '—'}</td>
                <td>
                  <button className="btn-sm" onClick={() => openEdit(d)}>Edit</button>
                  <button className="btn-sm danger" onClick={() => remove(d.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{modal === 'create' ? 'Add Department' : 'Edit Department'}</h3>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
