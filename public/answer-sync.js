// Per-student/per-attempt draft plus a single coalescing upload worker.
// Never store credentials, accepted answers or question content in the draft.
export function createAnswerSync({
  userId,
  attemptId,
  taskId,
  practice,
  deadline,
  questionIds,
  answers = {},
  answerRevision = 0,
  send,
  changed = () => {},
  status = () => {},
  completed = () => {},
  now = Date.now,
  timeoutMs = 12000,
}) {
  const key = `lexiclass-answer-draft:v1:${userId}:${practice ? "practice" : "exam"}:${attemptId}`;
  const allowed = new Set(questionIds),
    stores = [];
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      if (globalThis[name]) stores.push(globalThis[name]);
    } catch {}
  }
  const clean = (value) =>
    Object.fromEntries(
      Object.entries(value || {}).filter(
        ([k, v]) => allowed.has(k) && typeof v === "string" && v.length <= 2000,
      ),
    );
  let current = clean(answers),
    pending = {},
    revision = answerRevision || 0;
  let running = null,
    controller = null,
    stopped = false,
    phase = "saved",
    localSaved = false,
    restored = 0;
  const drafts = [];
  for (const store of stores) {
    try {
      const draft = JSON.parse(store.getItem(key) || "null");
      if (
        draft?.userId === userId &&
        draft.attemptId === attemptId &&
        draft.taskId === taskId &&
        draft.deadline === deadline &&
        deadline > now()
      )
        drafts.push(draft);
    } catch {}
  }
  const draft = drafts.sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (draft) {
    for (const [id, value] of Object.entries(clean(draft.answers))) {
      if (
        Object.hasOwn(draft.pending || {}, id) ||
        (!Object.hasOwn(current, id) && value)
      ) {
        if (current[id] !== value) restored++;
        current[id] = value;
        pending[id] = value;
      }
    }
  }
  function persist() {
    const value = JSON.stringify({
      userId,
      attemptId,
      taskId,
      deadline,
      updatedAt: Date.now(),
      answers: current,
      pending,
    });
    localSaved = false;
    for (const store of stores) {
      try {
        store.setItem(key, value);
        localSaved = true;
      } catch {}
    }
    return localSaved;
  }
  function report() {
    status({
      phase,
      revision,
      dirty: Object.keys(pending).length > 0,
      localSaved,
      restored,
    });
  }
  function replaceFromServer(next, nextRevision, acknowledged = null) {
    const before = current;
    if (acknowledged)
      for (const [id, value] of Object.entries(acknowledged)) {
        if (Object.hasOwn(pending, id) && pending[id] === value)
          delete pending[id];
      }
    current = { ...clean(next), ...pending };
    revision = nextRevision;
    persist();
    const ids = [
      ...new Set([...Object.keys(before), ...Object.keys(current)]),
    ].filter((id) => before[id] !== current[id]);
    if (ids.length) changed({ ...current }, { remote: true, ids });
  }
  function clear() {
    for (const store of stores) {
      try {
        store.removeItem(key);
      } catch {}
    }
  }
  function timedSend(body) {
    controller = new AbortController();
    const active = controller;
    let timer;
    const aborted = new Promise((_, reject) => {
      active.signal.addEventListener(
        "abort",
        () => reject(new Error("答案上传暂未完成，请恢复网络后重试。")),
        { once: true },
      );
      timer = setTimeout(() => active.abort(), timeoutMs);
    });
    return Promise.race([
      Promise.resolve().then(() => send(body, active.signal)),
      aborted,
    ]).finally(() => {
      clearTimeout(timer);
      if (controller === active) controller = null;
    });
  }
  function flush() {
    if (stopped || !Object.keys(pending).length)
      return running || Promise.resolve();
    if (running) return running;
    running = (async () => {
      let conflicts = 0;
      while (!stopped && Object.keys(pending).length) {
        const batch = { ...pending };
        phase = "saving";
        report();
        let result;
        try {
          result = await timedSend({ answers: batch, baseRevision: revision });
        } catch (error) {
          if (stopped) return;
          if (
            error.status === 409 &&
            error.data?.answers &&
            Number.isSafeInteger(error.data.answerRevision) &&
            conflicts++ < 3
          ) {
            replaceFromServer(error.data.answers, error.data.answerRevision);
            continue;
          }
          phase = "error";
          persist();
          report();
          throw error;
        }
        if (stopped) return;
        if (result.attempt?.submittedAt) {
          clear();
          completed(result.attempt);
          return;
        }
        // Older/demo servers do not return revisions. They still acknowledge
        // this batch; production servers return their canonical merged map.
        replaceFromServer(
          result.answers || { ...current, ...batch },
          Number.isSafeInteger(result.answerRevision)
            ? result.answerRevision
            : revision,
          batch,
        );
        phase = Object.keys(pending).length ? "saving" : "saved";
        report();
      }
    })().finally(() => {
      running = null;
    });
    return running;
  }
  persist();
  return {
    get answers() {
      return { ...current };
    },
    get dirty() {
      return Object.keys(pending).length > 0;
    },
    get restored() {
      return restored;
    },
    get localSaved() {
      return localSaved;
    },
    set(id, value) {
      if (
        stopped ||
        !allowed.has(id) ||
        typeof value !== "string" ||
        value.length > 2000 ||
        current[id] === value ||
        (value === "" && !Object.hasOwn(current, id))
      )
        return false;
      current[id] = value;
      pending[id] = value;
      persist();
      changed({ ...current }, { remote: false, ids: [id] });
      phase = "pending";
      report();
      return true;
    },
    flush,
    report,
    clear,
    stop() {
      stopped = true;
      controller?.abort();
    },
  };
}
