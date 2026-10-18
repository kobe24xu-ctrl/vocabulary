import { test } from "node:test";
import assert from "node:assert/strict";
import {
  selectLocalEnglishVoice,
  speakLocalEnglish,
} from "../public/speech.js";

const remote = { name: "Online English", lang: "en-GB", localService: false };
const local = { name: "Installed English", lang: "en-US", localService: true };
class Utterance {
  constructor(text) {
    this.text = text;
  }
}

test("only installed English voices are eligible, even if an online voice is the default", () => {
  assert.equal(
    selectLocalEnglishVoice([{ ...remote, default: true }, local]),
    local,
  );
  assert.equal(
    selectLocalEnglishVoice([remote, { lang: "zh-CN", localService: true }]),
    null,
  );
  const british = { lang: "en_GB", localService: true };
  assert.equal(selectLocalEnglishVoice([local, british]), british);
});

test("narration explicitly pins a local voice and language", async () => {
  let spoken,
    cancelled = false;
  const synth = {
    getVoices: () => [remote, local],
    cancel: () => {
      cancelled = true;
    },
    speak: (u) => {
      spoken = u;
    },
  };
  const result = await speakLocalEnglish("Explain the opportunity cost.", {
    synth,
    Utterance,
  });
  assert.equal(cancelled, true);
  assert.equal(spoken, result);
  assert.equal(spoken.voice, local);
  assert.equal(spoken.lang, local.lang);
});

test("missing local voices do not invoke online narration", async () => {
  let played = false;
  const synth = {
    getVoices: () => [remote],
    speak: () => {
      played = true;
    },
  };
  await assert.rejects(
    speakLocalEnglish("A sentence.", { synth, Utterance }),
    /离线英文语音包/,
  );
  assert.equal(played, false);
});

test("asynchronously loaded installed voices remain local", async () => {
  let voices = [],
    handler;
  const synth = {
    getVoices: () => voices,
    addEventListener: (_event, listener) => {
      handler = listener;
      queueMicrotask(() => {
        voices = [local];
        listener();
      });
    },
    removeEventListener: (_event, listener) => assert.equal(listener, handler),
    cancel() {},
    speak() {},
  };
  const result = await speakLocalEnglish("A sentence.", { synth, Utterance });
  assert.equal(result.voice, local);
});
