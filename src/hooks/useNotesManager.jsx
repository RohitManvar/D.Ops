import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { addToOfflineQueue, flushOfflineQueue } from "@/lib/offlineSync";
import { useToast } from "@/components/ui/toast";

const todayISO = () => new Date().toISOString().slice(0, 10);

export function createEmptyNote(user_id, project) {
  return {
    id: crypto.randomUUID(),
    user_id,
    date: todayISO(),
    project: project || "Project",
    summary: "",
    updates: [{ id: crypto.randomUUID(), text: "", done: false }],
    blockers: "",
    tomorrow: "",
    pinned: false,
    tags: []
  };
}

export function buildWhatsappMessage(note) {
  let msg = `*Daily Update: ${note.date}*\n*Project:* ${note.project}\n`;
  if (note.summary?.trim()) msg += `\n*Summary:*\n${note.summary.trim()}\n`;
  const done = note.updates.filter((u) => u.text.trim() && u.done);
  const pending = note.updates.filter((u) => u.text.trim() && !u.done);
  if (done.length || pending.length) msg += `\n*Work Updates:*\n`;
  done.forEach((u) => { msg += `✅ ${u.text.trim()}\n`; });
  pending.forEach((u) => { msg += `⏳ ${u.text.trim()}\n`; });
  if (note.blockers?.trim()) msg += `\n*Blockers/Dependencies:*\n${note.blockers.trim()}\n`;
  if (note.tomorrow?.trim()) msg += `\n*Plan for Tomorrow:*\n${note.tomorrow.trim()}\n`;
  return msg;
}

export function useNotesManager(user, customProjects) {
  const { addToast } = useToast();
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [noteApprovals, setNoteApprovals] = useState({});

  const saveTimerRef = useRef(null);

  const isSchemaError = (err) =>
    err?.message?.includes("schema cache") ||
    err?.message?.includes("column") ||
    err?.message?.includes("pinned") ||
    err?.message?.includes("tags");

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from("notes").select("*").eq("user_id", user.id).order("date", { ascending: false });
    
    if (error) { 
      addToast("Failed to load notes", "error"); 
      setLoadingNotes(false); 
      return; 
    }

    if (data && data.length > 0 && !("pinned" in data[0])) {
      setMigrationNeeded(true);
    }

    let allNotes = (data || []).map((n) => ({ ...n, pinned: n.pinned ?? false, tags: n.tags ?? [] }));

    const today = todayISO();
    if (!allNotes.some((n) => n.date === today)) {
      const todayNote = createEmptyNote(user.id, customProjects[0] || "VSM Automation Tool");
      todayNote.whatsapp_message = buildWhatsappMessage(todayNote);
      const { id: _tid, pinned: _tp, tags: _tt, ...todayPayload } = todayNote;
      const { data: inserted, error: insertError } = await supabase.from("notes").insert(todayPayload).select().single();
      if (insertError) {
        if (isSchemaError(insertError)) setMigrationNeeded(true);
      } else if (inserted) {
        allNotes = [{ ...inserted, pinned: false, tags: [] }, ...allNotes];
      }
    }

    if (allNotes.length > 0) {
      setNotes(allNotes);
      const todayNote = allNotes.find((n) => n.date === today);
      setSelectedId(todayNote?.id || allNotes[0].id);

      const noteIds = allNotes.map(n => n.id);
      const { data: appData } = await supabase
        .from("approvals")
        .select("target_id, status")
        .eq("target_type", "daily_update")
        .eq("requester_id", user.id)
        .in("target_id", noteIds);

      if (appData) {
        const approvalMap = {};
        appData.forEach(app => {
          approvalMap[app.target_id] = app.status;
        });
        setNoteApprovals(approvalMap);
      }
    }
    setLoadingNotes(false);
  }, [user.id, customProjects, addToast]);

  useEffect(() => {
    flushOfflineQueue().then(() => loadNotes());
  }, [loadNotes]);

  const saveNote = useCallback(async (noteToSave) => {
    setSaving(true);
    const { id, user_id, created_at, ...rest } = noteToSave;
    const fullPayload = { ...rest, updated_at: new Date().toISOString() };
    
    if (!navigator.onLine) {
      addToOfflineQueue("notes", id, fullPayload, user.id);
      setSaving(false);
      return;
    }

    let { error } = await supabase
      .from("notes").update(fullPayload).eq("id", id).eq("user_id", user.id);
      
    if (error && isSchemaError(error)) {
      setMigrationNeeded(true);
      const { pinned: _p, tags: _t, ...safePayload } = fullPayload;
      ({ error } = await supabase
        .from("notes").update(safePayload).eq("id", id).eq("user_id", user.id));
    }
    
    if (error) {
      if (error.message?.includes("fetch") || error.message?.includes("Failed to fetch")) {
        addToOfflineQueue("notes", id, fullPayload, user.id);
      } else {
        addToast("Failed to save", "error");
      }
    }
    setSaving(false);
  }, [user.id, addToast]);

  const debouncedSave = useCallback((noteToSave) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveNote(noteToSave);
    }, 800);
  }, [saveNote]);

  const updateSelected = useCallback((patch) => {
    let nextNote = null;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== selectedId) return n;
        nextNote = { ...n, ...patch };
        nextNote.whatsapp_message = buildWhatsappMessage(nextNote);
        return nextNote;
      })
    );
    if (nextNote) debouncedSave(nextNote);
  }, [debouncedSave, selectedId]);

  const addNewNote = async (template) => {
    const selectedNote = notes.find(n => n.id === selectedId);
    const currentProject = selectedNote?.project || customProjects[0] || "VSM Automation Tool";
    const note = createEmptyNote(user.id, currentProject);
    if (template) {
      note.summary = template.data.summary;
      note.updates = template.data.updates.map((u) => ({ ...u, id: crypto.randomUUID() }));
      note.blockers = template.data.blockers;
      note.tomorrow = template.data.tomorrow;
    }
    note.whatsapp_message = buildWhatsappMessage(note);
    const { id: _localId, pinned: _lp, tags: _lt, ...insertPayload } = note;
    const { data: inserted, error } = await supabase.from("notes").insert(insertPayload).select().single();
    if (error) {
      console.error("Failed to create note:", error);
      addToast(error.message || "Failed to create note", "error");
      return null;
    }
    setNotes((prev) => [{ ...inserted, pinned: false, tags: [] }, ...prev]);
    setSelectedId(inserted.id);
    addToast(template ? `${template.name} note created` : "New note created", "success");
    return inserted;
  };

  const jumpToDate = async (dateStr) => {
    if (!dateStr) return null;
    const existing = notes.find((n) => n.date === dateStr);
    if (existing) {
      setSelectedId(existing.id);
      return existing;
    } else {
      const selectedNote = notes.find(n => n.id === selectedId);
      const note = createEmptyNote(user.id, selectedNote?.project || customProjects[0] || "VSM Automation Tool");
      note.date = dateStr;
      note.whatsapp_message = buildWhatsappMessage(note);
      const { id: _jid, pinned: _jp, tags: _jt, ...jumpPayload } = note;
      const { data: inserted, error } = await supabase.from("notes").insert(jumpPayload).select().single();
      if (error) { 
        console.error("jumpToDate insert error:", error); 
        addToast(error.message || "Failed to create note", "error"); 
        return null; 
      }
      setNotes((prev) =>
        [...prev, { ...inserted, pinned: false, tags: [] }].sort((a, b) => b.date.localeCompare(a.date))
      );
      setSelectedId(inserted.id);
      addToast(`Note created for ${dateStr}`, "success");
      return inserted;
    }
  };

  const deleteSelected = async () => {
    if (!selectedId) return;
    const { error } = await supabase.from("notes").delete().eq("id", selectedId).eq("user_id", user.id);
    if (error) { addToast("Failed to delete note", "error"); return; }
    const remaining = notes.filter((n) => n.id !== selectedId);
    if (remaining.length) { 
      setNotes(remaining); 
      setSelectedId(remaining[0].id); 
    } else {
      const fresh = createEmptyNote(user.id, customProjects[0] || "VSM Automation Tool");
      fresh.whatsapp_message = buildWhatsappMessage(fresh);
      const { id: _fid, pinned: _fp, tags: _ft, ...freshPayload } = fresh;
      const { data: inserted } = await supabase.from("notes").insert(freshPayload).select().single();
      if (inserted) { setNotes([inserted]); setSelectedId(inserted.id); }
    }
    addToast("Note deleted", "deleted");
  };

  const carryForwardTasks = async () => {
    const selectedNote = notes.find(n => n.id === selectedId);
    if (!selectedNote) return;
    const incompleteTasks = selectedNote.updates.filter((u) => !u.done && u.text.trim());
    if (!incompleteTasks.length) { addToast("No incomplete tasks to carry forward", "info"); return; }
    
    const tomorrow = new Date(selectedNote.date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().slice(0, 10);
    const existingNote = notes.find((n) => n.date === tomorrowDate);
    
    if (existingNote) {
      const newUpdates = [
        ...existingNote.updates,
        ...incompleteTasks.map((u) => ({ id: crypto.randomUUID(), text: `[Carried] ${u.text}`, done: false })),
      ];
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== existingNote.id) return n;
          const updatedNote = { ...n, updates: newUpdates };
          updatedNote.whatsapp_message = buildWhatsappMessage(updatedNote);
          debouncedSave(updatedNote);
          return updatedNote;
        })
      );
      setSelectedId(existingNote.id);
      addToast(`Carried forward to ${tomorrowDate}`, "success");
    } else {
      const newNote = createEmptyNote(user.id, selectedNote.project);
      newNote.date = tomorrowDate;
      newNote.updates = incompleteTasks.map((u) => ({ id: crypto.randomUUID(), text: `[Carried] ${u.text}`, done: false }));
      newNote.whatsapp_message = buildWhatsappMessage(newNote);
      const { id: _cid, pinned: _cp, tags: _ct, ...carryPayload } = newNote;
      const { data: inserted, error } = await supabase.from("notes").insert(carryPayload).select().single();
      if (error) { addToast("Failed to create tomorrow's note", "error"); return; }
      setNotes((prev) =>
        [...prev, { ...inserted, pinned: false, tags: [] }].sort((a, b) => b.date.localeCompare(a.date))
      );
      setSelectedId(inserted.id);
      addToast(`Carried forward to new note on ${tomorrowDate}`, "success");
    }
  };

  return {
    notes, setNotes,
    loadingNotes, saving,
    selectedId, setSelectedId,
    migrationNeeded, noteApprovals,
    loadNotes, saveNote, debouncedSave,
    updateSelected, addNewNote, jumpToDate,
    deleteSelected, carryForwardTasks
  };
}
