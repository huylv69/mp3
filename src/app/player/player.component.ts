import {
  Component,
  OnInit,
  Inject,
  EventEmitter,
  ElementRef,
  animate,
  trigger,
  state,
  style,
  transition
} from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { SiteConfig } from '../site-config';
import { Song } from '../song';
import { MusicService } from '../music.service';

declare const $: any;

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss'],
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'scale(0.5)'
        }),
        animate('0.4s ease-out', style({
          opacity: 1,
          transform: 'scale(1)'
        }))
      ])
    ])
  ]
})
export class PlayerComponent implements OnInit {
  private thumbnails = [];
  private audio: HTMLAudioElement;
  private currentProgress = 0;
  private timeLeft = '00:00';
  private timeRemain = '00:00';
  private subThumbnail: Subject<string>;

  private get name(): string {
    return this.current == null ? '' : this.current.name;
  }

  private get artist(): string {
    return this.current == null ? '' : this.current.artist;
  }

  private get loop(): boolean {
    return this.audio == null || this.audio.loop === true;
  }

  private set loop(val: boolean) {
    if (this.audio != null) {
      this.audio.loop = val;
    }
  }

  public current: Song;
  public nextSong: EventEmitter<number>;
  constructor(
    @Inject('SiteConfig') private siteConfig: SiteConfig,
    private musicService: MusicService,
    private er: ElementRef
  ) {
    this.thumbnails.push(siteConfig.defaultThumbnail);
    this.nextSong = new EventEmitter();
  }

  ngOnInit() {
    const audio = this.audio = window['bach'] = new Audio();
    audio.autoplay = true;
    audio.loop = true;
    audio.addEventListener('timeupdate', () => this.updateTime());
    audio.addEventListener('ended', () => {
      this.nextSong.emit(0);
    });

    // Subject thumbnail
    this.subThumbnail = new Subject();
    this.subThumbnail
      .distinctUntilChanged()
      .switchMap(url => {
        return this.musicService.getThumbnail(url).then(() => url);
      })
      .subscribe(url => this.thumbnails.push(url) && setTimeout(() => this.thumbnails.shift(), 1000));

    this.initSlider();
  }

  play(song: Song) {
    if (song === this.current) {
      return;
    }
    this.current = song;
    this.audio.src = song.source;
    this.audio.play();
    setTimeout(() => this.updateTime(), 0);
    if (song.cover) {
      this.subThumbnail.next(song.cover);
    } else {
      this.subThumbnail.next(this.siteConfig.defaultThumbnail);
    }
  }

  fmat(x: number): string {
    x = Math.trunc(x);
    if (x < 10) {
      return '0' + x;
    }
    return '' + x;
  }

  updateTime(): void {
    let current = 0, remain = 0;
    this.currentProgress = 0;
    if (!Number.isNaN(this.audio.duration)) {
      current = Math.trunc(this.audio.currentTime);
      remain = Math.trunc(this.audio.duration) - current;
      this.currentProgress = this.audio.currentTime / this.audio.duration * 100;
    }
    this.timeLeft = this.fmat(current / 60) + ':' + this.fmat(current % 60);
    this.timeRemain = this.fmat(remain / 60) + ':' + this.fmat(remain % 60);
  }

  togglePlayState() {
    if (this.audio != null && !isNaN(this.audio.duration)) {
      if (this.audio.paused) {
        this.audio.play();
      } else {
        this.audio.pause();
      }
    }
  }

  next(x = 1): void {
    this.nextSong.emit(x);
  }

  seek(e: any): void {
    // Only accept left mouse button
    if (e.button === 0) {
      const wid: number = e.target.offsetWidth;
      const x: number = e.offsetX;
      if (this.audio != null && !isNaN(this.audio.duration)) {
        const newTime = x / wid * this.audio.duration;
        this.audio.currentTime = newTime;
      }
    }
  }

  initSlider() {
    const $slider = $(this.er.nativeElement).find('.slider');
    const height = $slider[0].offsetHeight;
    $slider.css('flex', 'none').css('height', height + 'px');
    $slider.slider({
      value: (1 - this.audio.volume) * 100,
      range: 'max',
      max: 100,
      animate: true,
      orientation: 'vertical',
      slide: (ev, ui) => {
        this.audio.volume = 1 - ui.value / 100;
        this.audio.muted = false;
      }
    });
  }
}
