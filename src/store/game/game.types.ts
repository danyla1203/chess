export type Figure = string;
export type Cell = string;
type White = { [index: Figure]: Cell };
export type Black = White;

export type Board = {
  white: White;
  black: Black;
};
