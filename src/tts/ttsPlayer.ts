import { getTtsServiceConfig, isCloudTtsAvailable, isWebSpeechAvailable } from "./ttsServiceConfig";

export interface TtsPlayerOptions {
  readonly fetchImpl?: typeof fetch;
}

export interface TtsPlaybackState {
  readonly isPlaying: boolean;
  readonly isPaused: boolean;
  readonly currentText: string | null;
}

class TtsPlayer {
  private webSpeechUtterance: SpeechSynthesisUtterance | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private _currentText: string | null = null;
  private _isPlaying = false;
  private _isPaused = false;
  private listeners = new Set<(state: TtsPlaybackState) => void>();

  get state(): TtsPlaybackState {
    return {
      isPlaying: this._isPlaying,
      isPaused: this._isPaused,
      currentText: this._currentText
    };
  }

  subscribe(listener: (state: TtsPlaybackState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.state;
    this.listeners.forEach((listener) => listener(state));
  }

  async speak(text: string, options?: TtsPlayerOptions): Promise<void> {
    this.stop();

    this._currentText = text;

    if (isCloudTtsAvailable()) {
      await this.speakWithCloud(text, options);
    } else if (isWebSpeechAvailable()) {
      this.speakWithWebSpeech(text);
    } else {
      this._currentText = null;
      throw new Error("没有可用的TTS服务。");
    }
  }

  pause(): void {
    if (!this._isPlaying) return;

    if (this.webSpeechUtterance) {
      window.speechSynthesis.pause();
    }

    if (this.audioElement) {
      this.audioElement.pause();
    }

    this._isPaused = true;
    this.notify();
  }

  resume(): void {
    if (!this._isPaused) return;

    if (this.webSpeechUtterance) {
      window.speechSynthesis.resume();
    }

    if (this.audioElement) {
      void this.audioElement.play();
    }

    this._isPaused = false;
    this.notify();
  }

  stop(): void {
    if (this.webSpeechUtterance) {
      window.speechSynthesis.cancel();
      this.webSpeechUtterance = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = "";
      this.audioElement = null;
    }

    this._isPlaying = false;
    this._isPaused = false;
    this._currentText = null;
    this.notify();
  }

  private speakWithWebSpeech(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    const config = getTtsServiceConfig();

    utterance.rate = config.rate;
    utterance.pitch = config.pitch;

    utterance.onstart = () => {
      this._isPlaying = true;
      this._isPaused = false;
      this.notify();
    };

    utterance.onend = () => {
      this._isPlaying = false;
      this._isPaused = false;
      this.webSpeechUtterance = null;
      this.notify();
    };

    utterance.onerror = () => {
      this._isPlaying = false;
      this._isPaused = false;
      this.webSpeechUtterance = null;
      this.notify();
    };

    this.webSpeechUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  private async speakWithCloud(text: string, options?: TtsPlayerOptions): Promise<void> {
    const fetchImpl = options?.fetchImpl ?? fetch;
    const config = getTtsServiceConfig();

    const response = await fetchImpl(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.api_key}`
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: config.voice,
        speed: config.rate
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloud TTS error ${response.status}: ${errorText}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio();
    audio.src = audioUrl;
    audio.playbackRate = config.rate;

    audio.onplaying = () => {
      this._isPlaying = true;
      this._isPaused = false;
      this.notify();
    };

    audio.onended = () => {
      this._isPlaying = false;
      this._isPaused = false;
      URL.revokeObjectURL(audioUrl);
      this.audioElement = null;
      this.notify();
    };

    audio.onerror = () => {
      this._isPlaying = false;
      this._isPaused = false;
      URL.revokeObjectURL(audioUrl);
      this.audioElement = null;
      this.notify();
    };

    this.audioElement = audio;
    await audio.play();
  }
}

export const ttsPlayer = new TtsPlayer();

export function speakText(text: string, options?: TtsPlayerOptions): Promise<void> {
  return ttsPlayer.speak(text, options);
}

export function pauseSpeech(): void {
  ttsPlayer.pause();
}

export function resumeSpeech(): void {
  ttsPlayer.resume();
}

export function stopSpeech(): void {
  ttsPlayer.stop();
}

export function getTtsState(): TtsPlaybackState {
  return ttsPlayer.state;
}
