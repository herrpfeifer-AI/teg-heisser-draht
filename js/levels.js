// Schalter-Rätsel: Level. Knoten mit Koordinaten (900×620), Kanten: [typ, a, b, start]
// typ: bat (a = Plus), w = Kabel, s = Schalter (start: true = zu), l = Lämpchen, t = Falle (Schalter, der eine Abkürzung macht)
export const LEVELS = [
  { name:'Der erste Schalter', tip:'Tippe auf den Schalter.', n:{ A:[170,120], B:[730,120], C:[730,500], D:[170,500] },
    e:[ ['bat','A','D'], ['s','A','B',false], ['l','B','C'], ['w','C','D'] ] },
  { name:'Zwei Schalter hintereinander', tip:'Der Strom muss durch beide Schalter.', n:{ A:[170,120], M:[450,120], B:[730,120], C:[730,500], D:[170,500] },
    e:[ ['bat','A','D'], ['s','A','M',false], ['s','M','B',true], ['l','B','C'], ['w','C','D'] ] },
  { name:'Zwei Wege', tip:'Jedes Lämpchen hat seinen eigenen Weg.', n:{ A:[150,120], M:[360,120], B:[560,120], E:[780,120], C:[560,500], F:[780,500], D:[150,500] },
    e:[ ['bat','A','D'], ['s','A','M',false], ['w','M','B'], ['s','B','E',false], ['l','B','C'], ['l','E','F'], ['w','C','F'], ['w','D','C'] ] },
  { name:'Achtung, Falle!', tip:'Ein Schalter macht eine Abkürzung. Dann gibt es einen Kurzschluss!', n:{ A:[170,120], B:[730,120], C:[730,500], D:[170,500], P:[400,120], Q:[400,500] },
    e:[ ['bat','A','D'], ['w','A','P'], ['s','P','B',false], ['l','B','C'], ['w','C','Q'], ['w','Q','D'], ['t','P','Q',true] ] },
  { name:'Die Umleitung', tip:'Ein Schalter führt am Lämpchen vorbei. Dann bleibt es dunkel.', n:{ A:[150,120], B:[450,120], C:[750,120], X:[450,300], Y:[750,300], D:[150,500], E:[750,500] },
    e:[ ['bat','A','D'], ['s','A','B',false], ['l','B','C'], ['t','B','X',true], ['w','X','Y'], ['w','C','Y'], ['l','Y','E'], ['w','E','D'] ] },
  { name:'Drei Lichtwächter', tip:'Bringe alle drei zum Leuchten – ohne Kurzschluss.', n:{ A:[120,110], P:[250,110], B:[380,110], C:[560,110], E:[760,110], K:[560,300], J:[760,300], D:[120,520], Q:[250,520], F:[380,520], G:[560,520], H:[760,520] },
    e:[ ['bat','A','D'], ['s','A','P',false], ['w','P','B'], ['t','P','Q',true], ['w','B','C'], ['w','C','E'], ['l','B','F'], ['s','C','K',false], ['l','K','G'], ['s','E','J',true], ['l','J','H'], ['w','D','Q'], ['w','Q','F'], ['w','F','G'], ['w','G','H'] ] },
  { name:'Der Kreuzweg', tip:'Manche Schalter schalten zwei Wege gleichzeitig. Probiere klug!', n:{ A:[120,110], B:[420,110], C:[760,110], X:[420,320], Y:[760,320], D:[120,520], E:[420,520], F:[760,520] },
    e:[ ['bat','A','D'], ['s','A','B',false], ['l','B','C'], ['s','B','X',false], ['s','C','Y',false], ['l','X','E'], ['w','Y','F'], ['s','C','F',false], ['w','E','F'], ['w','D','E'], ['s','X','Y',true] ] },
];
