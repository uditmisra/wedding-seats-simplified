const ADJ = ["luna","river","ivory","sage","amber","rose","willow","linen","velvet","plum","honey","silk","ember","dune","blush","aspen","wren","fern","clove","dahlia"];
const NOUN = ["meadow","garden","harbor","bloom","grove","circle","table","feast","ring","bay","field","crest","light","dance","wave","manor","loom","echo","verse","stone"];

export function generatePlanCode() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const b = NOUN[Math.floor(Math.random() * NOUN.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${a}-${b}-${n}`;
}