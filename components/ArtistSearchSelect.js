'use client';

import { useEffect, useMemo, useState } from 'react';

export default function ArtistSearchSelect({ customers = [], value = '', onChange, label = 'customer' }) {
  customers = Array.isArray(customers) ? customers : [];

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [items, setItems] = useState(customers);
  const [msg, setMsg] = useState('');

  // Keep a local selection as well as the parent-controlled value.
  // This makes a tap collapse the picker immediately on mobile instead of
  // waiting for the parent form to re-render.
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  useEffect(() => {
    setItems(Array.isArray(customers) ? customers : []);
  }, [customers]);

  const selected = items.find(
    (customer) => String(customer.id) === String(localValue)
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((customer) => {
        if (!term) return true;
        return `${customer.artist_name || ''} ${customer.full_name || ''} ${customer.email || ''} ${customer.phone || ''}`
          .toLowerCase()
          .includes(term);
      })
      .slice(0, 12);
  }, [q, items]);

  function choose(customer) {
    if (!customer?.id) return;

    const nextId = customer.id;

    // Close first so the dropdown disappears immediately after a tap.
    setOpen(false);
    setAdding(false);
    setQ('');
    setLocalValue(nextId);
    onChange?.(nextId);

    // Dismiss the iOS keyboard if the search field was focused.
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  function clearSelection() {
    setLocalValue('');
    setQ('');
    setOpen(true);
    onChange?.('');
  }

  async function add(event) {
    event.preventDefault();
    setMsg('Adding…');

    const raw = Object.fromEntries(new FormData(event.currentTarget).entries());
    const body = { ...raw, harmfulMusicPolicy: true };

    const response = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMsg(json.error || 'Could not add customer.');
      return;
    }

    const customer = {
      id: json.id,
      full_name: body.fullName,
      artist_name: body.artistName,
      email: body.email,
      phone: body.phone || null,
    };

    setItems((current) => [customer, ...current]);
    choose(customer);
    setMsg('');
  }

  return (
    <div className="artistSearch">
      {selected && !open ? (
        <div className="customerPickerSelected">
          <span className="engAvatar mini">
            {(selected.artist_name || selected.full_name || '?')[0].toUpperCase()}
          </span>
          <span>
            <b>{selected.artist_name || selected.full_name}</b>
            <small>
              {[
                selected.full_name !== selected.artist_name && selected.full_name,
                selected.email,
                selected.phone,
              ]
                .filter(Boolean)
                .join(' · ')}
            </small>
          </span>
          <button type="button" onClick={clearSelection}>
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            value={q}
            placeholder={`Search ${label} by artist, name, email or phone…`}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQ(event.target.value);
              setLocalValue('');
              onChange?.('');
              setOpen(true);
            }}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
          />

          {open && (
            <div className="artistResults">
              {results.map((customer) => (
                <button
                  type="button"
                  key={customer.id}
                  // Do not prevent mousedown/pointer events here. On iOS Safari
                  // that can suppress the synthetic click and leave the menu open.
                  onClick={() => choose(customer)}
                >
                  <span className="engAvatar mini">
                    {(customer.artist_name || customer.full_name || '?')[0].toUpperCase()}
                  </span>
                  <span>
                    <b>{customer.artist_name || customer.full_name}</b>
                    <small>
                      {[
                        customer.full_name !== customer.artist_name && customer.full_name,
                        customer.email,
                        customer.phone,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </span>
                </button>
              ))}

              {!results.length && (
                <div className="artistNoResult">No matching customer.</div>
              )}

              <button
                type="button"
                className="customerPickerAdd"
                onClick={() => setAdding(true)}
              >
                + Add new customer
              </button>
            </div>
          )}
        </>
      )}

      {adding && (
        <form className="customerPickerCreate" onSubmit={add}>
          <b>Add customer without leaving</b>
          <input name="fullName" required placeholder="Full name" />
          <input name="artistName" required placeholder="Artist name" />
          <input name="email" type="email" required placeholder="Email" />
          <input name="phone" placeholder="Phone (optional)" />
          <p className="muted">
            Only add them once they have agreed to Silkcrayon’s No Harmful Music Policy.
          </p>
          <div>
            <button type="button" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit">Add &amp; select</button>
          </div>
          {msg && <small>{msg}</small>}
        </form>
      )}
    </div>
  );
}
