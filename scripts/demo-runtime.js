// This adapter is bundled ONLY into the downloadable, single-browser demo.
// It is never loaded by the real application server and is not authentication.
(() => {
  const storageKey = "lexiclass-offline-demo-v1";
  const uid = () => crypto.randomUUID();
  const digest = async (value) =>
    Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(String(value)),
        ),
      ),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  const reject = (message, status = 400) => {
    throw Object.assign(new Error(message), { status });
  };
  const copy = (value) => JSON.parse(JSON.stringify(value));
  let db;
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(db));
    } catch {
      document.querySelector("#offline-storage-note").textContent =
        "浏览器未允许本地保存，关闭后记录可能丢失。";
    }
  }
  const teacher = () => db.users.find((u) => u.role === "teacher");
  const user = () => db.users.find((u) => u.id === db.sessionId);
  const requireUser = (role) => {
    const u = user();
    if (!u) reject("请先登录演示账号。", 401);
    if (role && u.role !== role) reject("请切换为对应的演示身份。", 403);
    return u;
  };
  const info = (u) => ({
    id: u.id,
    name: u.role === "teacher" ? "演示 Master" : u.name,
    role: u.role,
    username: u.role === "teacher" ? "master" : u.username,
    classId: u.classId,
    className:
      u.role === "teacher"
        ? "国际预科教学中心"
        : db.classes.find((c) => c.id === u.classId)?.name,
    program: u.program,
    initialPassword: !!u.initialPassword,
    isDemo: true,
  });
  const allowed = (task, student) =>
    task.classIds.includes(student.classId) &&
    (task.audience === "all" || task.audience.includes(student.id));
  const taskView = ({ questions, ...task }) => ({
    ...task,
    questionCount: questions.length,
  });
  const attemptFor = (tid, sid) =>
    db.attempts.find((a) => a.taskId === tid && a.studentId === sid);

  const attemptView = (a) =>
    a
      ? { ...a, ...attemptTiming(a.startedAt, a.submittedAt, a.deadline) }
      : null;
  function finish(attempt, answers, timedOut = false) {
    if (attempt.submittedAt) return attempt;
    const task = db.tasks.find((t) => t.id === attempt.taskId);
    const result = mark(task.questions, answers);
    Object.assign(attempt, {
      answers,
      result,
      score: result.score,
      submittedAt: Date.now(),
      timedOut,
    });
    for (const r of result.results) {
      if (r.correct) continue;
      const question = task.questions.find((q) => q.id === r.questionId);
      let mistake = db.mistakes.find(
        (m) =>
          m.studentId === attempt.studentId &&
          reviewWordKey(task.program, m.question.wordId, m.question.subject) ===
            reviewWordKey(task.program, question.wordId, question.subject) &&
          m.question.direction === question.direction,
      );
      if (!mistake) {
        mistake = { id: uid(), studentId: attempt.studentId, errorCount: 0 };
        db.mistakes.push(mistake);
      }
      Object.assign(mistake, {
        question,
        errorCount: mistake.errorCount + 1,
        streak: 0,
        nextReview: Date.now(),
        lastAnswer: r.submitted,
        resolved: false,
      });
    }
    return attempt;
  }
  function sweep() {
    let changed = false;
    for (const a of db.attempts)
      if (!a.submittedAt && a.deadline <= Date.now()) {
        finish(a, a.answers, true);
        changed = true;
      }
    if (changed) persist();
  }
  async function studentCreate(raw) {
    const name = String(raw.name || "").trim(),
      cls = db.classes.find((c) => c.id === raw.classId);
    if (!name || !cls) reject("请选择班级，并填写学生姓名。");
    if (db.users.some((u) => u.classId === cls.id && u.name === name))
      reject("该班级已有同名演示学生。", 409);
    const invite = crypto.getRandomValues(new Uint32Array(2)).join("");
    const student = {
      id: uid(),
      role: "student",
      name,
      classId: cls.id,
      program: cls.program,
      inviteHash: await digest(invite),
      username: null,
      passwordHash: null,
    };
    db.users.push(student);
    return { ...info(student), invite };
  }
  function taskCreate(raw) {
    if (!raw.title?.trim()) reject("请填写任务名称。");
    if (!PROGRAMS.includes(raw.program) || !SUBJECTS.includes(raw.subject))
      reject("请选择有效课程项目和科目。");
    if (
      !Array.isArray(raw.classIds) ||
      !raw.classIds.length ||
      raw.classIds.some(
        (id) =>
          !db.classes.some((c) => c.id === id && c.program === raw.program),
      )
    )
      reject("请选择当前项目下的班级。");
    if (
      raw.audience !== "all" &&
      (!Array.isArray(raw.audience) ||
        !raw.audience.length ||
        raw.audience.some(
          (id) =>
            !db.users.some(
              (u) => u.id === id && raw.classIds.includes(u.classId),
            ),
        ))
    )
      reject("请选择有效的接收学生。");
    const opensAt = Date.parse(raw.opensAt),
      closesAt = Date.parse(raw.closesAt),
      duration = Number(raw.duration);
    if (
      !Number.isFinite(opensAt) ||
      !Number.isFinite(closesAt) ||
      closesAt <= Math.max(opensAt, Date.now()) ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 180
    )
      reject("请设置有效的时间和答题时长。");
    const pool = db.words
      .filter((w) => wordAvailableFor(w, raw.program, raw.subject))
      .map((w) => ({ ...w, subject: raw.subject }));
    const selected = [...new Set(raw.wordIds || [])].map((id) =>
      pool.find((w) => w.id === id),
    );
    if (!selected.length || selected.some((w) => !w))
      reject("请选择有效场景词汇。");
    if (!["mixed", "en-zh", "zh-en", "choice"].includes(raw.mode))
      reject("请选择题型。");
    const task = {
      id: uid(),
      title: raw.title.trim(),
      program: raw.program,
      subject: raw.subject,
      mode: raw.mode,
      classIds: [...raw.classIds],
      audience: raw.audience,
      opensAt,
      closesAt,
      duration,
      createdAt: Date.now(),
      questions: buildQuestions(selected, raw.mode, pool),
    };
    db.tasks.unshift(task);
    return taskView(task);
  }
  async function seed() {
    db = {
      version: 1,
      users: [
        {
          id: uid(),
          role: "teacher",
          name: "林老师",
          email: "demo@lexiclass.local",
        },
      ],
      classes: [],
      words: copy(SAMPLE_WORDS),
      tasks: [],
      attempts: [],
      mistakes: [],
      sessionId: null,
    };
    db.sessionId = teacher().id;
    PROGRAMS.forEach((program, i) =>
      db.classes.push({
        id: uid(),
        name: ["UNSW 商科 A 班", "NCUK 国际预科 1 班", "UOW 商科 B 班"][i],
        program,
      }),
    );
    const names = [
      "陈思远",
      "林雨桐",
      "王子涵",
      "刘书言",
      "张予安",
      "许知夏",
      "周亦辰",
      "赵若宁",
      "沈星河",
      "李可欣",
      "宋以宁",
      "杨景然",
    ];
    for (let i = 0; i < names.length; i++)
      await studentCreate({ name: names[i], classId: db.classes[i % 3].id });
    const at = Date.now(),
      economics = db.words.filter((w) => w.subject === "Economics");
    const base = {
      program: PROGRAMS[0],
      subject: "Economics",
      duration: 15,
      mode: "mixed",
      classIds: [db.classes[0].id],
      audience: "all",
      wordIds: economics.slice(0, 6).map((w) => w.id),
    };
    const old = taskCreate({
      ...base,
      title: "市场机制与经济决策",
      opensAt: new Date(at - 86400000).toISOString(),
      closesAt: new Date(at + 3600000).toISOString(),
    });
    const oldTask = db.tasks.find((t) => t.id === old.id);
    oldTask.closesAt = at - 3600000;
    db.users
      .filter((u) => u.classId === db.classes[0].id)
      .forEach((s, i) => {
        const a = {
          id: uid(),
          taskId: old.id,
          studentId: s.id,
          startedAt: at - 7200000,
          deadline: at - 6300000,
          answers: {},
          submittedAt: null,
        };
        db.attempts.push(a);
        finish(
          a,
          Object.fromEntries(
            oldTask.questions.map((q, j) => [
              q.id,
              j < 6 - (i % 3) ? q.answer : "不确定",
            ]),
          ),
        );
      });
    taskCreate({
      ...base,
      title: "经济学 · 核心概念场景听写",
      opensAt: new Date(at - 60000).toISOString(),
      closesAt: new Date(at + 86400000).toISOString(),
    });
    taskCreate({
      title: "数学 · 函数与统计词汇",
      program: PROGRAMS[1],
      subject: "Mathematics",
      duration: 10,
      mode: "choice",
      classIds: [db.classes[1].id],
      audience: "all",
      wordIds: db.words
        .filter((w) => w.subject === "Mathematics")
        .map((w) => w.id),
      opensAt: new Date(at + 3600000).toISOString(),
      closesAt: new Date(at + 172800000).toISOString(),
    });
    persist();
  }
  const ready = (async () => {
    try {
      db = JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch {}
    if (!db || db.version !== 1) await seed();
    for (const row of [...db.users, ...db.classes, ...db.words, ...db.tasks]) {
      if (row.program === "UOW 伍伦贡预科") row.program = "UOW 沃隆港预科";
    }
    persist();
  })();

  async function route(path, method, body) {
    if (path === "/api/config")
      return {
        programs: PROGRAMS,
        subjects: SUBJECTS,
        subjectNames: SUBJECT_NAMES,
        masterAccount: "master",
        managementModel: "single-master",
        setupRequired: false,
        demoAvailable: true,
        serverTime: Date.now(),
      };
    if (path === "/api/demo" && method === "POST") {
      db.sessionId = teacher().id;
      return { user: info(teacher()) };
    }
    if (path === "/api/logout") {
      db.sessionId = null;
      return { ok: true };
    }
    if (path === "/api/login") {
      let u;
      if (body.role === "teacher")
        reject("本机演示无需教师密码，请点击顶部的「回到教师端」。");
      if (body.username) {
        u = db.users.find(
          (u) =>
            u.role === "student" &&
            u.username === String(body.username).trim().toLowerCase(),
        );
        if (!u || u.passwordHash !== (await digest(body.password)))
          reject("演示账号或密码不正确。", 401);
      } else {
        const h = await digest(
          String(body.invite || "")
            .replace(/\s/g, "")
            .toUpperCase(),
        );
        u = db.users.find(
          (u) =>
            u.role === "student" &&
            u.inviteHash === h &&
            u.name === String(body.name).trim(),
        );
        if (!u) reject("演示姓名或学习码不正确。", 401);
      }
      db.sessionId = u.id;
      return { user: info(u) };
    }
    if (path === "/api/student/activate") {
      const h = await digest(
        String(body.invite || "")
          .replace(/\s/g, "")
          .toUpperCase(),
      );
      const u = db.users.find(
        (u) =>
          u.role === "student" &&
          u.inviteHash === h &&
          u.name === String(body.name).trim(),
      );
      if (!u) reject("演示姓名或学习码不正确。", 401);
      const username = String(body.username || "")
        .trim()
        .toLowerCase();
      if (username === "master")
        reject("master 为管理账号，请选择其他学生账号。");
      if (
        !username ||
        username.length > 60 ||
        !/^[\p{L}\p{N}][\p{L}\p{N} .·_-]*$/u.test(username) ||
        typeof body.password !== "string" ||
        body.password.length < 10
      )
        reject("请输入有效姓名账号和至少 10 位的演示密码。");
      if (db.users.some((s) => s.id !== u.id && s.username === username))
        reject("该演示账号已存在。", 409);
      Object.assign(u, {
        username,
        passwordHash: await digest(body.password),
        inviteHash: null,
      });
      db.sessionId = u.id;
      return { user: info(u) };
    }
    const u = requireUser();
    if (path === "/api/me") return { user: info(u), serverTime: Date.now() };
    if (path === "/api/demo/switch") {
      const target = body.studentId
        ? db.users.find((s) => s.role === "student" && s.id === body.studentId)
        : teacher();
      if (!target) reject("未找到演示学生。", 404);
      db.sessionId = target.id;
      return { user: info(target) };
    }
    if (path === "/api/account/password" && method === "POST") {
      const u = requireUser("student");
      if (
        !u.passwordHash ||
        (await digest(body.currentPassword)) !== u.passwordHash
      )
        reject("当前密码不正确，演示切换身份需先开通测试账号。", 403);
      if (
        typeof body.newPassword !== "string" ||
        body.newPassword.length < 10 ||
        body.newPassword.length > 200 ||
        !body.newPassword.trim()
      )
        reject("新密码需要 10–200 个字符。");
      u.passwordHash = await digest(body.newPassword);
      u.initialPassword = false;
      return { user: info(u), ok: true };
    }
    const courseRoute = path.match(/^\/api\/classes\/([^/]+)\/courses$/);
    if (courseRoute && method === "PUT") {
      requireUser("teacher");
      const cls = db.classes.find((c) => c.id === courseRoute[1]);
      if (!cls) reject("未找到班级。", 404);
      if (!Array.isArray(body.courses) || body.courses.length > SUBJECTS.length)
        reject("班级科目格式不正确。");
      const seen = new Set();
      cls.courses = body.courses.map((c) => {
        if (
          !SUBJECTS.includes(c.subject) ||
          seen.has(c.subject) ||
          typeof c.title !== "string" ||
          !c.title.trim() ||
          c.title.length > 60 ||
          typeof c.content !== "string" ||
          c.content.length > 10000
        )
          reject("班级科目格式不正确。");
        seen.add(c.subject);
        return {
          subject: c.subject,
          title: c.title.trim(),
          content: c.content,
          source: c.source || "master 维护",
        };
      });
      return { courses: cls.courses };
    }
    if (path === "/api/classes") {
      requireUser("teacher");
      if (method === "POST") {
        if (!body.name?.trim() || !PROGRAMS.includes(body.program))
          reject("请填写班级名称和课程项目。");
        const cls = {
          id: uid(),
          name: body.name.trim(),
          program: body.program,
        };
        db.classes.push(cls);
        return { class: cls };
      }
      return {
        classes: db.classes.map((c) => ({
          ...c,
          studentCount: db.users.filter((s) => s.classId === c.id).length,
        })),
      };
    }
    if (path === "/api/students") {
      requireUser("teacher");
      if (method === "POST") {
        const before = copy(db.users);
        try {
          const students = [];
          for (const row of body.students || [body])
            students.push(await studentCreate(row));
          return { students };
        } catch (e) {
          db.users = before;
          throw e;
        }
      }
      return {
        students: db.users
          .filter((s) => s.role === "student")
          .map((s) => {
            const attempts = db.attempts.filter(
              (a) => a.studentId === s.id && a.submittedAt,
            );
            return {
              id: s.id,
              name: s.name,
              program: s.program,
              classId: s.classId,
              username: s.username,
              accountReady: !!s.passwordHash,
              attempts: attempts.length,
              average: attempts.length
                ? Math.round(
                    attempts.reduce((sum, a) => sum + a.score, 0) /
                      attempts.length,
                  )
                : null,
              mistakes: db.mistakes.filter(
                (m) => m.studentId === s.id && !m.resolved,
              ).length,
            };
          }),
      };
    }
    const inviteRoute = path.match(/^\/api\/students\/([^/]+)\/invite$/);
    if (inviteRoute) {
      requireUser("teacher");
      const student = db.users.find(
        (s) => s.id === inviteRoute[1] && s.role === "student",
      );
      if (!student) reject("未找到学生。", 404);
      const invite = crypto.getRandomValues(new Uint32Array(2)).join("");
      student.inviteHash = await digest(invite);
      student.passwordHash = null;
      return { invite };
    }
    if (path === "/api/words") {
      requireUser("teacher");
      if (method === "POST") {
        const words = (body.words || [body]).map((raw) => {
          if (
            !raw.term ||
            !raw.translation ||
            !raw.sentence?.toLowerCase().includes(raw.term.toLowerCase()) ||
            !raw.sentenceZh?.includes(raw.translation)
          )
            reject("请输入词汇、释义与包含目标词的双语场景句。");
          return {
            ...raw,
            id: uid(),
            aliases: raw.aliases || [],
            source: raw.source || "演示自建词汇",
          };
        });
        db.words.push(...words);
        return { words };
      }
      return { words: db.words };
    }
    if (path === "/api/tasks/batch") {
      requireUser("teacher");
      const before = copy(db.tasks);
      try {
        return { tasks: body.tasks.map(taskCreate) };
      } catch (e) {
        db.tasks = before;
        throw e;
      }
    }
    const deleteTask = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (deleteTask && method === "DELETE") {
      requireUser("teacher");
      if (!db.tasks.some((t) => t.id === deleteTask[1]))
        reject("考试不存在或已删除。", 404);
      db.attempts = db.attempts.filter((a) => a.taskId !== deleteTask[1]);
      db.tasks = db.tasks.filter((t) => t.id !== deleteTask[1]);
      return { ok: true };
    }
    if (path === "/api/tasks") {
      if (method === "POST") {
        requireUser("teacher");
        return { task: taskCreate(body) };
      }
      return {
        tasks: db.tasks
          .filter((t) => u.role === "teacher" || allowed(t, u))
          .map((t) => {
            const task = taskView(t);
            if (u.role === "student")
              return { ...task, attempt: attemptView(attemptFor(t.id, u.id)) };
            const students = db.users.filter(
                (s) => s.role === "student" && allowed(t, s),
              ),
              attempts = db.attempts.filter(
                (a) => a.taskId === t.id && a.submittedAt,
              );
            return {
              ...task,
              studentCount: students.length,
              submitted: attempts.length,
              average: attempts.length
                ? Math.round(
                    attempts.reduce((sum, a) => sum + a.score, 0) /
                      attempts.length,
                  )
                : null,
            };
          }),
        serverTime: Date.now(),
      };
    }
    const start = path.match(/^\/api\/tasks\/([^/]+)\/start$/);
    if (start) {
      requireUser("student");
      const task = db.tasks.find((t) => t.id === start[1] && allowed(t, u));
      if (!task) reject("未找到分配给你的演示考试。", 404);
      let a = attemptFor(task.id, u.id);
      if (!a) {
        if (Date.now() < task.opensAt || Date.now() >= task.closesAt)
          reject("考试尚未开放或已经截止。", 409);
        a = {
          id: uid(),
          taskId: task.id,
          studentId: u.id,
          startedAt: Date.now(),
          deadline: Math.min(Date.now() + task.duration * 60000, task.closesAt),
          answers: {},
          submittedAt: null,
          result: null,
          score: null,
          timedOut: false,
        };
        db.attempts.push(a);
      }
      return {
        task: taskView(task),
        attempt: attemptView(a),
        questions: a.submittedAt ? [] : task.questions.map(publicQuestion),
        serverTime: Date.now(),
      };
    }
    const attemptRoute = path.match(/^\/api\/attempts\/([^/]+)(\/submit)?$/);
    if (attemptRoute) {
      requireUser("student");
      const a = db.attempts.find(
        (a) => a.id === attemptRoute[1] && a.studentId === u.id,
      );
      if (!a) reject("未找到答题记录。", 404);
      if (a.submittedAt) return { attempt: attemptView(a) };
      if (Date.now() >= a.deadline)
        return { attempt: attemptView(finish(a, a.answers, true)) };
      if (!body.answers || typeof body.answers !== "object")
        reject("答案格式不正确。");
      a.answers = body.answers;
      if (attemptRoute[2])
        return { attempt: attemptView(finish(a, a.answers)) };
      return { savedAt: Date.now(), serverTime: Date.now() };
    }
    if (path === "/api/results") {
      requireUser("teacher");
      return {
        results: db.tasks.flatMap((t) =>
          db.users
            .filter((s) => s.role === "student" && allowed(t, s))
            .map((s) => {
              const a = attemptFor(t.id, s.id);
              return {
                taskId: t.id,
                taskTitle: t.title,
                program: t.program,
                subject: t.subject,
                studentId: s.id,
                name: s.name,
                classId: s.classId,
                className: db.classes.find((c) => c.id === s.classId)?.name,
                state: a?.submittedAt
                  ? "submitted"
                  : a
                    ? "in_progress"
                    : Date.now() >= t.closesAt
                      ? "missing"
                      : "pending",
                ...attemptTiming(a?.startedAt, a?.submittedAt, a?.deadline),
                score: a?.score ?? null,
                submittedAt: a?.submittedAt || null,
                timedOut: a?.timedOut || false,
                result: a?.result || null,
              };
            }),
        ),
      };
    }
    if (path === "/api/mistakes") {
      requireUser("student");
      return { mistakes: db.mistakes.filter((m) => m.studentId === u.id) };
    }
    const review = path.match(/^\/api\/mistakes\/([^/]+)\/review$/);
    if (review) {
      requireUser("student");
      const m = db.mistakes.find(
        (m) => m.id === review[1] && m.studentId === u.id,
      );
      if (!m) reject("未找到错题。", 404);
      if (m.nextReview > Date.now())
        reject("本次已复习，请等待下次复习时间。", 409);
      const correct = isCorrect(body.answer, m.question.accepted);
      m.streak = correct ? m.streak + 1 : 0;
      m.resolved = m.streak >= 3;
      m.nextReview =
        Date.now() +
        (correct ? [1, 3, 7][Math.min(m.streak - 1, 2)] * 86400000 : 600000);
      m.lastAnswer = body.answer;
      if (!correct) m.errorCount++;
      return {
        correct,
        answer: m.question.answer,
        streak: m.streak,
        resolved: m.resolved,
        nextReview: m.nextReview,
      };
    }
    reject("该操作不在本机演示范围内。", 404);
  }

  // All API calls stay in this browser. No request is forwarded to a server.
  window.fetch = async (input, options = {}) => {
    try {
      await ready;
      sweep();
      const raw = String(input);
      if (!raw.startsWith("/api/")) reject("本机演示不会连接外部服务器。", 403);
      const result = await route(
        raw.split("?")[0],
        options.method || "GET",
        JSON.parse(options.body || "{}"),
      );
      persist();
      return new Response(JSON.stringify(copy(result)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(
        JSON.stringify({ error: e.message || "演示操作失败" }),
        {
          status: e.status || 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  };
  document
    .querySelector("#offline-teacher")
    .addEventListener("click", async () => {
      await ready;
      db.sessionId = teacher().id;
      persist();
      sessionStorage.removeItem("lexiclass-offline-exam");
      location.href = location.href.split(/[?#]/)[0];
    });
  document
    .querySelector("#offline-reset")
    .addEventListener("click", async () => {
      if (!confirm("重置本机演示班级、成绩和错题？此操作不影响正式网站数据。"))
        return;
      await ready;
      await seed();
      localStorage.removeItem("lexiclass-offline-entry");
      sessionStorage.removeItem("lexiclass-offline-exam");
      location.href = location.href.split(/[?#]/)[0];
    });
})();
