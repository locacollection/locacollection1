const https = require('https');

const list = [
  'photo-1610030469983-98e550d6193c',
  'photo-1583391733956-3750e0ff4e8b',
  'photo-1594938298603-c8148c4dae35',
  'photo-1617627143750-d86bc21e42bb',
  'photo-1609357605129-26f69add5d6e',
  'photo-1563245372-f21724e3856d',
  'photo-1619086303291-0ef7699e4b31',
  'photo-1572804013309-59a88b7e92f1',
  'photo-1598808503746-f34c53b9323e',
  'photo-1617137968427-85924c800a22',
  'photo-1610652492500-ded49ceeb378',
  'photo-1507679799987-c73779587ccf',
  'photo-1534030347209-467a5b0ad3e6',
  'photo-1605518216938-7c31b7b14ad0',
  'photo-1506794778202-cad84cf45f1d',
  'photo-1543163521-1bf539c55dd2',
  'photo-1542291026-7eec264c27ff',
  'photo-1595950653106-6c9ebd614d3a',
  'photo-1560769629-975ec94e6a86',
  'photo-1533867617858-e7b97e060509',
  'photo-1549298916-b41d501d3772',
  'photo-1584917865442-de89df76afd3',
  'photo-1601121141461-9d6647bca1ed',
  'photo-1590736704728-f4730bb30770',
  'photo-1535632066927-ab7c9ab60908',
  'photo-1614252235316-8c857d38b5f4',
  'photo-1627123424574-724758594e93',
  'photo-1592945403244-b3fbafd7f539',
  'photo-1541643600914-78b084683601',
  'photo-1523293182086-7651a899d37f',
  'photo-1503919545889-aef636e10ad4',
  'photo-1516627145497-ae6968895b74'
];

async function checkDesc() {
  for (const id of list) {
    try {
      const res = await fetch(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&q=80`);
      console.log(id, res.status);
    } catch(e) {
      console.log(id, 'ERR', e.message);
    }
  }
}
checkDesc();
