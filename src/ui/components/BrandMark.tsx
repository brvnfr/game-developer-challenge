import logo from '@assets/logo_jungle_gaming.svg';

/** Jungle Gaming's wordmark in a corner of the menus, linking to their site (in a new tab). */
export function BrandMark() {
  return (
    <a
      className="brand-mark"
      href="https://junglegaming.io/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Jungle Gaming (opens in a new tab)"
    >
      <img src={logo} alt="" />
    </a>
  );
}
