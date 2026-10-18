// Never let the browser fall back to an online/cloud voice.
export function selectLocalEnglishVoice(voices) {
  const priority = (voice) => {
    const lang = voice.lang.toLowerCase().replaceAll("_", "-");
    return ["en-gb", "en-au", "en-us"].indexOf(lang) < 0
      ? 3
      : ["en-gb", "en-au", "en-us"].indexOf(lang);
  };
  return (
    voices
      .filter(
        (voice) =>
          voice.localService === true && /^en(?:[-_]|$)/i.test(voice.lang),
      )
      .sort((a, b) => priority(a) - priority(b))[0] ?? null
  );
}

export async function speakLocalEnglish(
  text,
  {
    synth = globalThis.speechSynthesis,
    Utterance = globalThis.SpeechSynthesisUtterance,
    onError = () => {},
  } = {},
) {
  if (!synth || !Utterance) throw new Error("此浏览器暂不支持本地朗读。");
  let voices = synth.getVoices();
  // Some browsers populate the installed voice list asynchronously.
  if (!voices.length) {
    voices = await new Promise((resolve) => {
      let timer;
      const done = () => {
        clearTimeout(timer);
        synth.removeEventListener("voiceschanged", done);
        resolve(synth.getVoices());
      };
      timer = setTimeout(done, 1200);
      synth.addEventListener("voiceschanged", done, { once: true });
    });
  }
  const voice = selectLocalEnglishVoice(voices);
  if (!voice)
    throw new Error("未找到本地英文语音，请先在电脑上安装离线英文语音包。");
  synth.cancel();
  const utterance = new Utterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.87;
  utterance.onerror = onError;
  synth.speak(utterance);
  return utterance;
}
