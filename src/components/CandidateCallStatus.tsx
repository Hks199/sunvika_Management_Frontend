import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { CALL_STATUSES, type CallStatus, type Candidate } from '../lib/calling-lists';

function localDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}
export default function CandidateCallStatus({ listId, candidate, onClose, onSaved }: { listId: string; candidate: Candidate; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<CallStatus>(candidate.callStatus ?? 'NOT_CALLED');
  const [note, setNote] = useState(candidate.callNote ?? ''), [followUp, setFollowUp] = useState(localDateTime(candidate.nextFollowUpAt));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (status === 'NEEDS_FOLLOWUP' && (!followUp || Number.isNaN(new Date(followUp).getTime()))) throw new Error('Choose a follow-up date and time.');
      await api.patch(`/calling-lists/${listId}/candidates/${candidate._id}/status`, { callStatus: status, callNote: note.trim(), nextFollowUpAt: status === 'NEEDS_FOLLOWUP' ? new Date(followUp).toISOString() : null });
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save calling status.'); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop"><form className="create-modal" aria-label="Candidate calling status" onSubmit={event => void submit(event)}><div className="modal-heading"><h2>Calling status - row {candidate.rowNumber}</h2></div><p>Mark the outcome after calling. Save the calling outcome and any follow-up details. Recorded calls uses the calling sheet's Total calling value.</p><fieldset className="calling-fieldset" disabled={busy}><div className="modal-fields"><label className="field-wide">Status<select value={status} onChange={event => setStatus(event.target.value as CallStatus)}>{CALL_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>{status === 'NEEDS_FOLLOWUP' && <label className="field-wide">Follow-up date and time<input type="datetime-local" required value={followUp} onChange={event => setFollowUp(event.target.value)}/></label>}<label className="field-wide">Calling note (optional)<textarea rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)}/></label></div></fieldset>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-btn" disabled={busy} onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy ? 'Saving...' : 'Record call'}</button></div></form></div>;
}
