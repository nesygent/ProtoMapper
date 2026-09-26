/** Shared helpers for learn pages */
export const P = (s) => s.trim();

export const toc = (route, items) => `
  <nav class="learn-toc" aria-label="On this page">
    <p class="learn-toc__title">On this page</p>
    ${items.map(([id, label]) => `<a href="#/learn/${route}" data-scroll="${id}">${label}</a>`).join("")}
  </nav>`;

export const epToc = (n, items) => toc(`protobuf/${n}`, items);

export const seasonNav = (current) => {
  const eps = [
    [0, "protobuf", "Season hub"],
    [1, "protobuf/1", "1 · Names vanished"],
    [2, "protobuf/2", "2 · Recruit crew"],
    [3, "protobuf/3", "3 · Whiteboard"],
    [4, "protobuf/4", "4 · Pull the job"],
    [5, "protobuf/5", "5 · Getaway"],
  ];
  return `
  <nav class="learn-toc" aria-label="Harbor Heist episodes">
    <p class="learn-toc__title">Harbor Heist</p>
    ${eps
      .map(
        ([num, route, label]) =>
          `<a href="#/learn/${route}" ${num === current ? 'aria-current="page"' : ""}>${label}</a>`
      )
      .join("")}
  </nav>`;
};
