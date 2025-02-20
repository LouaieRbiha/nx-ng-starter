export interface IToolbarButton {
  routerLink: { outlets: { [key: string]: string[] } }[];
  routeActive: () => boolean;
  icon: string;
  title: string;
}

export interface IToolbarAnchor {
  href: string;
  icon: string;
  title: string;
}
