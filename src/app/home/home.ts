import { AfterViewInit, Component, ElementRef, inject, OnDestroy, signal } from '@angular/core';
import { Header } from '../common-ui/header/header';
import { Hero } from '../common-ui/hero/hero';

type Seat = 'solo' | 'host' | 'guest';
type Phase = 'idle' | 'solo' | 'host' | 'guest' | 'unknown';

const ROOM_KEY = 'midnight-bureau-room';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Component({
  selector: 'app-home',
  imports: [Header, Hero],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;
  private unlisten?: () => void;

  protected readonly seat = signal<Seat>('solo');
  protected readonly phase = signal<Phase>('idle');
  protected readonly code = signal('');
  protected readonly room = signal<string | null>(this.readRoom());
  protected readonly copied = signal(false);
  protected readonly copyFailed = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly faqOpen = signal<number | null>(0);
  protected readonly year = new Date().getFullYear();
  protected readonly motes = Array.from({ length: 18 }, (_, id) => ({
    id,
    left: (id * 53) % 100,
    delay: -((id * 1.7) % 14),
    duration: 18 + (id % 6) * 3,
    size: id % 4 === 0 ? 3 : 2,
  }));

  protected choose(seat: Seat): void {
    this.seat.set(seat);
    if (this.phase() !== 'idle') {
      this.phase.set('idle');
    }
  }

  protected onCode(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    this.code.set(value);
    if (this.phase() === 'unknown' || this.phase() === 'guest') {
      this.phase.set('idle');
    }
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.copied.set(false);
    this.copyFailed.set(false);

    if (this.seat() === 'solo') {
      this.phase.set('solo');
      return;
    }

    if (this.seat() === 'host') {
      const code = this.room() ?? this.makeCode();
      sessionStorage.setItem(ROOM_KEY, code);
      this.room.set(code);
      this.phase.set('host');
      return;
    }

    const entered = this.code().trim().toUpperCase();
    const stored = this.readRoom();
    if (stored && entered === stored) {
      this.room.set(stored);
      this.phase.set('guest');
      return;
    }

    this.phase.set('unknown');
  }

  protected async copyRoom(): Promise<void> {
    const code = this.room();
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
      this.copyFailed.set(false);
    } catch {
      this.copied.set(false);
      this.copyFailed.set(true);
    }
  }

  protected backToDesk(): void {
    this.phase.set('idle');
    this.copied.set(false);
    this.copyFailed.set(false);
  }

  protected toggleFaq(index: number): void {
    this.faqOpen.set(this.faqOpen() === index ? null : index);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  ngAfterViewInit(): void {
    const root = this.host.nativeElement as HTMLElement;
    const nodes = Array.from(root.querySelectorAll('.reveal'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      nodes.forEach((node) => node.classList.add('is-in'));
    } else {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            entry.target.classList.add('is-in');
            this.observer?.unobserve(entry.target);
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
      );
      nodes.forEach((node) => this.observer?.observe(node));
    }

    const torch = root.querySelector('.torch');
    const canFollow =
      !reduce &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      torch instanceof HTMLElement;
    const onPointer = (event: PointerEvent) => {
      if (!(torch instanceof HTMLElement)) {
        return;
      }
      torch.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      torch.classList.add('is-on');
    };
    if (canFollow) {
      window.addEventListener('pointermove', onPointer, { passive: true });
    }

    this.unlisten = () => {
      window.removeEventListener('pointermove', onPointer);
    };
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.unlisten?.();
  }

  private readRoom(): string | null {
    try {
      return sessionStorage.getItem(ROOM_KEY);
    } catch {
      return null;
    }
  }

  private makeCode(): string {
    const bytes = new Uint32Array(4);
    crypto.getRandomValues(bytes);
    const body = Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]).join('');
    return `N-${body}`;
  }
}
