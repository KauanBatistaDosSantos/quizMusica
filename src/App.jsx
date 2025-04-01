import React, { useState, useEffect, useRef } from 'react';
import './index.css';

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function App() {
  const [lyrics, setLyrics] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [audioStarted, setAudioStarted] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [segmentEnded, setSegmentEnded] = useState(false);
  const [musicasPredefinidas, setMusicasPredefinidas] = useState([]);
  const [musicaSelecionada, setMusicaSelecionada] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinalizado, setQuizFinalizado] = useState(false);
  const audioRef = useRef(null);
  const replayTimeoutRef = useRef(null);

  const avancarTrecho = () => {
    setSelectedOption(null);
    setFeedback(null);
    setSegmentEnded(false);
    setCurrentIndex((prev) => prev + 1);
    audioRef.current?.play();
  };

  useEffect(() => {
    fetch('/musicas/musicas.json')
      .then(res => res.json())
      .then(data => setMusicasPredefinidas(data));
  }, []);

  useEffect(() => {
    if (lyrics.length > 0 && currentIndex < lyrics.length) {
      setShuffledOptions(shuffleArray(lyrics[currentIndex].options));
    }
  }, [currentIndex, lyrics]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (!lyrics.length || currentIndex >= lyrics.length - 1) return;
      const nextTime = lyrics[currentIndex + 1].time;
      if (audio.currentTime >= nextTime) {
        if (feedback === 'correct') {
          avancarTrecho();
        } else {
          setSegmentEnded(true);
          audio.pause();
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [lyrics, currentIndex, feedback]);

  useEffect(() => {
    if (segmentEnded && feedback === 'correct') {
      avancarTrecho();
    }
  }, [segmentEnded, feedback]);

  useEffect(() => {
    if (currentIndex >= lyrics.length && lyrics.length > 0) {
      setAudioStarted(false);
      setQuizFinalizado(true);
    }
  }, [currentIndex, lyrics]);

  const carregarLetra = (texto) => {
    const lines = texto.split('\n');
    const parsedLyrics = [];
    let block = {};

    for (let line of lines) {
      if (line.startsWith('[')) {
        const match = line.match(/\[(\d+):(\d+\.\d+)](.+)/);
        if (match) {
          const [_, min, sec, phrase] = match;
          block.time = parseFloat(min) * 60 + parseFloat(sec);
          block.phrase = phrase.trim();
        }
      } else if (line.startsWith('options:')) {
        block.options = line.split(':')[1].split(',').map(opt => opt.trim());
      } else if (line.startsWith('answer:')) {
        block.answer = line.split(':')[1].trim();
        parsedLyrics.push(block);
        block = {};
      }
    }
    setLyrics(parsedLyrics);
  };

  const carregarMusicaPredefinida = async (musica) => {
    const res = await fetch(musica.letra);
    const texto = await res.text();
    carregarLetra(texto);
    setAudioUrl(musica.audio);
    setAudioStarted(false);
    setCurrentIndex(0);
    setFeedback(null);
    setSelectedOption(null);
    setSegmentEnded(false);
    setMusicaSelecionada(true);
    setScore(0);
    setQuizFinalizado(false);
  };

  const startQuiz = () => {
    if (!audioRef.current || lyrics.length === 0) return;
    audioRef.current.currentTime = lyrics[0].time;
    audioRef.current.play();
    setAudioStarted(true);
  };

  const handleOptionClick = (option) => {
    if (feedback === 'correct') return;
    setSelectedOption(option);
    const isCorrect = option === lyrics[currentIndex].answer;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      setScore(score + 1);
      if (segmentEnded) avancarTrecho();
    }
  };

  const replayTrecho = () => {
    if (!audioRef.current || !lyrics[currentIndex]) return;
    const inicio = lyrics[currentIndex].time;
    const fim = currentIndex + 1 < lyrics.length ? lyrics[currentIndex + 1].time : audioRef.current.duration;
    audioRef.current.currentTime = inicio;
    audioRef.current.play();

    if (replayTimeoutRef.current) {
      clearTimeout(replayTimeoutRef.current);
    }

    const intervalo = (fim - inicio) * 1000;
    replayTimeoutRef.current = setTimeout(() => {
      if (feedback !== 'correct') {
        audioRef.current.pause();
        setSegmentEnded(true);
      }
    }, intervalo);
  };

  const currentLyric = lyrics[currentIndex];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-center">🎧 Quiz de Música</h1>
        {musicaSelecionada && (
          <button
            className="text-blue-600 underline"
            onClick={() => {
              setMusicaSelecionada(false);
              setAudioUrl(null);
              setLyrics([]);
              setAudioStarted(false);
              setFeedback(null);
              setSelectedOption(null);
              setCurrentIndex(0);
              setScore(0);
              setQuizFinalizado(false);
            }}
          >
            🔄 Escolher outra música
          </button>
        )}
      </div>

      {quizFinalizado && (
        <div className="p-4 text-center bg-green-100 border border-green-300 rounded">
          <h2 className="text-xl font-bold">✅ Quiz Finalizado!</h2>
          <p className="text-lg">Você acertou {score} de {lyrics.length} palavras.</p>
        </div>
      )}

      {!musicaSelecionada && (
        <>
          <div>
            <h2 className="font-semibold mb-2">🎵 Músicas disponíveis</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {musicasPredefinidas.map((musica) => (
                <div
                  key={musica.slug}
                  className="border rounded shadow hover:shadow-lg cursor-pointer"
                  onClick={() => carregarMusicaPredefinida(musica)}
                >
                  <img src={musica.capa} alt={musica.nome} className="w-full h-40 object-cover rounded-t" />
                  <div className="p-2 text-center font-medium">{musica.nome}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-medium">Ou envie sua própria música:</label>
            <input type="file" accept="audio/*" onChange={(e) => setAudioUrl(URL.createObjectURL(e.target.files[0]))} />

            <label className="block font-medium mt-2">Letra (.txt):</label>
            <input
              type="file"
              accept=".txt"
              onChange={(e) => {
                const reader = new FileReader();
                reader.onload = (event) => carregarLetra(event.target.result);
                reader.readAsText(e.target.files[0]);
                setMusicaSelecionada(true);
              }}
            />
          </div>
        </>
      )}

      {audioUrl && <audio ref={audioRef} src={audioUrl} />}

      {musicaSelecionada && (
        <>
          <button
            onClick={startQuiz}
            disabled={audioStarted || !audioUrl || lyrics.length === 0}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Começar Quiz
          </button>

          {audioStarted && currentLyric && (
            <div className="border rounded p-4 bg-white shadow">
              <h2 className="text-xl font-bold mb-4">Complete a frase:</h2>
              <p className="text-lg mb-4">{currentLyric.phrase}</p>
              <div className="grid grid-cols-3 gap-2">
                {shuffledOptions.map((opt) => (
                  <button
                    key={opt}
                    className={`p-2 border rounded transition-all duration-200 text-sm font-medium
                      ${feedback === 'correct' && opt === lyrics[currentIndex].answer ? 'bg-green-500 text-white' : ''}
                      ${feedback === 'incorrect' && opt === selectedOption ? 'bg-red-500 text-white' : ''}
                      ${feedback !== 'correct' && feedback !== 'incorrect' ? 'bg-gray-100 hover:bg-gray-200' : ''}`}
                    disabled={feedback === 'correct'}
                    onClick={() => handleOptionClick(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <button
                className="mt-4 px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                onClick={replayTrecho}
              >
                🔁 Ouvir trecho novamente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
