import { useEffect, useMemo, useRef, useState } from "react";
import data from "../audio/voiceLines.json";
import { renderLine, voiceKey } from "../audio/voiceLines";

/**
 * Voice studio (development only — `npm run dev`, open /studio).
 * Record a real human take for every line; saving writes public/audio/voice/human/<key>.<ext> and updates the
 * manifest so the game plays the human take instead of the generated voice. Commit the files to ship them.
 */
interface Row {
  key: string;
  id: string;
  text: string;
}

function allRows(): Row[] {
  const rows: Row[] = [];
  for (const [id, line] of Object.entries(data.lines as Record<string, { text: string; vary?: Record<string, (string | number)[]> }>)) {
    const vary = line.vary;
    if (!vary) {
      rows.push({ key: id, id, text: renderLine(id) });
      continue;
    }
    const keys = Object.keys(vary);
    const combos = keys.reduce<Record<string, string | number>[]>((acc, k) => acc.flatMap((c) => vary[k]!.map((v) => ({ ...c, [k]: v }))), [{}]);
    for (const vars of combos) rows.push({ key: voiceKey(id, vars), id, text: renderLine(id, vars) });
  }
  return rows;
}

export default function Studio() {
  const rows = useMemo(allRows, []);
  const [manifest, setManifest] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");
  const [recKey, setRecKey] = useState<string | null>(null);
  const [take, setTake] = useState<{ key: string; blob: Blob; url: string } | null>(null);
  const [msg, setMsg] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);

  const reload = () => fetch(`/audio/voice/manifest.json?t=${Date.now()}`).then((r) => r.json() as Promise<{ clips: Record<string, string> }>).then((m) => setManifest(m.clips)).catch(() => undefined);
  useEffect(() => void reload(), []);

  const play = (src: string) => void new Audio(src).play();

  const record = async (key: string) => {
    setMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: false } });
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType });
        setTake({ key, blob, url: URL.createObjectURL(blob) });
        setRecKey(null);
      };
      recorder.current = rec;
      rec.start();
      setRecKey(key);
    } catch {
      setMsg("Microphone not available. Allow mic access for this page.");
    }
  };

  const save = async () => {
    if (!take) return;
    const ext = take.blob.type.includes("mp4") ? "m4a" : take.blob.type.includes("ogg") ? "ogg" : "webm";
    const res = await fetch(`/__studio/save?key=${encodeURIComponent(take.key)}&ext=${ext}`, { method: "POST", body: take.blob });
    setMsg(res.ok ? `Saved ${take.key}` : "Save failed — is the dev server running?");
    setTake(null);
    void reload();
  };

  const remove = async (key: string) => {
    await fetch(`/__studio/take?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    void reload();
  };

  const shown = rows.filter((r) => !filter || r.key.includes(filter) || r.text.toLowerCase().includes(filter.toLowerCase()));
  const humanCount = Object.values(manifest).filter((f) => f.startsWith("human/")).length;

  return (
    <main className="studio">
      <h1>Voice studio</h1>
      <p>
        {humanCount} of {rows.length} lines recorded by a human. Tips: quiet room, mouth ~20 cm from the mic, smile while you speak,
        leave half a second of silence before and after. Saved takes replace the generated voice immediately; commit
        <code> public/audio/voice/human/ </code> and <code>manifest.json</code> to ship them.
      </p>
      <input placeholder="Filter lines…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      {msg && <p role="status">{msg}</p>}
      <table>
        <tbody>
          {shown.map((r) => {
            const file = manifest[r.key];
            const human = file?.startsWith("human/");
            return (
              <tr key={r.key} className={human ? "human" : ""}>
                <td className="k">{r.key}</td>
                <td className="t">{r.text}</td>
                <td>{file && <button type="button" onClick={() => play(`/audio/voice/${file}?t=${Date.now()}`)}>▶ {human ? "human" : "generated"}</button>}</td>
                <td>
                  {recKey === r.key ? (
                    <button type="button" className="rec on" onClick={() => recorder.current?.stop()}>■ Stop</button>
                  ) : (
                    <button type="button" className="rec" disabled={!!recKey} onClick={() => void record(r.key)}>● Record</button>
                  )}
                  {take?.key === r.key && (
                    <>
                      <button type="button" onClick={() => play(take.url)}>▶ take</button>
                      <button type="button" onClick={() => void save()}>Save</button>
                      <button type="button" onClick={() => setTake(null)}>Discard</button>
                    </>
                  )}
                  {human && <button type="button" onClick={() => void remove(r.key)}>Remove human take</button>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
