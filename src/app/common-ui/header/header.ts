import { AfterViewInit, Component, OnDestroy, signal } from '@angular/core';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements AfterViewInit, OnDestroy {
  private unlisten?: () => void;

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  ngAfterViewInit(): void {
    const onScroll = () => {
      if (window.scrollY > 12) {
        this.scrolled.set(true);
      } else {
        this.scrolled.set(false);
      }
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    this.unlisten = () => window.removeEventListener('scroll', onScroll);
  }

  ngOnDestroy(): void {
    this.unlisten?.();
  }
}