export type Line = {
  id: string;
  name: string;
  members: number;
  plan: string;
  logo: string;
  fallbackTint: string;
  initial: string;
};

export const lines: Line[] = [
  { id: "2go", name: "2GO Travel", members: 38, plan: "Business", logo: "/imgs/2go.png", fallbackTint: "bg-pink-600", initial: "2G" },
  { id: "fastcat", name: "FastCat", members: 19, plan: "Business", logo: "/imgs/fastcat.png", fallbackTint: "bg-blue-600", initial: "F" },
  { id: "montenegro", name: "Montenegro Lines", members: 24, plan: "Business", logo: "/imgs/montenegro.png", fallbackTint: "bg-emerald-700", initial: "M" },
  { id: "oceanjet", name: "OceanJet", members: 16, plan: "Business", logo: "/imgs/oceanjet.jpg", fallbackTint: "bg-red-600", initial: "O" },
  { id: "starlite", name: "Starlite Ferries", members: 12, plan: "Starter", logo: "/imgs/startlite.png", fallbackTint: "bg-amber-500", initial: "S" },
  { id: "trans-asia", name: "Trans-Asia Shipping Lines", members: 22, plan: "Business", logo: "/imgs/tansasia.png", fallbackTint: "bg-yellow-500", initial: "T" },
  { id: "weesam", name: "Weesam Express", members: 8, plan: "Starter", logo: "/imgs/weesam.jpg", fallbackTint: "bg-sky-500", initial: "W" },
];
