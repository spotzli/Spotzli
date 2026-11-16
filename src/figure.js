export function lumoSvg(mood){
  const L='var(--m-line)';
  const eyesOpen=(dx=0,dy=0)=>`<circle cx="47" cy="62" r="5.5" fill="${L}"/><circle cx="73" cy="62" r="5.5" fill="${L}"/><circle cx="${48.8+dx}" cy="${60+dy}" r="1.9" fill="#fff"/><circle cx="${74.8+dx}" cy="${60+dy}" r="1.9" fill="#fff"/>`;
  const eyesClosed=`<path d="M41 63q6 5 12 0M67 63q6 5 12 0" stroke="${L}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const eyesHappy=`<path d="M41 64q6-7 12 0M67 64q6-7 12 0" stroke="${L}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const smile=`<path d="M53 73q7 6 14 0" stroke="${L}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const big=`<path d="M51 72q9 12 18 0z" fill="${L}"/><path d="M55 76q5 4 10 0" fill="#FF7A9C"/>`;
  const oh=`<ellipse cx="62" cy="75" rx="3.5" ry="4" fill="${L}"/>`;
  const arm=(x,y,r)=>`<ellipse cx="${x}" cy="${y}" rx="7" ry="12" transform="rotate(${r} ${x} ${y})" fill="var(--m-body)" stroke="${L}" stroke-width="2.5"/>`;
  const heart=(x,y,sc=1)=>`<path transform="translate(${x} ${y}) scale(${sc})" d="M0 3C0-1 5-2 6 2c1-4 6-3 6 1 0 4-6 7-6 8C6 10 0 7 0 3z" fill="#FF6F96"/>`;
  const spark=(x,y)=>`<path d="M${x} ${y-5}l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#FFC542"/>`;
  let arms='',face='',extra='';
  switch(mood){
    case 'calm':arms=arm(36,84,25)+arm(84,84,-25);face=eyesClosed+smile;break;
    case 'hug':arms=arm(18,64,-55)+arm(102,64,55);face=eyesHappy+big;extra=heart(8,30,1)+heart(98,24,.8);break;
    case 'think':arms=arm(24,82,20)+arm(80,76,-60);face=eyesOpen(1.5,-2)+oh;extra=`<text x="96" y="34" font-size="22" font-weight="800" fill="${L}" font-family="sans-serif">?</text>`;break;
    case 'cheer':arms=arm(20,46,-25)+arm(100,46,25);face=eyesHappy+big;extra=spark(14,24)+spark(106,22)+spark(96,8);break;
    case 'cozy':arms=arm(46,86,55)+arm(74,86,-55);face=eyesClosed+smile;extra=heart(53,82,1.2);break;
    case 'sad':arms=arm(30,88,10)+arm(90,88,-10);face=`<path d="M40 55l9-4M80 55l-9-4" stroke="${L}" stroke-width="2.5" stroke-linecap="round"/>`+eyesOpen(0,1.5)+`<path d="M54 79q6-5 12 0" stroke="${L}" stroke-width="3" fill="none" stroke-linecap="round"/>`;extra=`<path d="M92 30a7 7 0 0 1 13-3 6 6 0 0 1 3 11H93a5 5 0 0 1-1-8z" fill="#C9D3EA"/>`+heart(10,40,.7);break;
    case 'party':arms=arm(18,40,-30)+arm(102,40,30);face=eyesHappy+big;extra=spark(12,20)+spark(108,18)+spark(60,6)+`<rect x="28" y="12" width="5" height="9" rx="1.5" fill="#FF6F96" transform="rotate(-25 30 16)"/><rect x="88" y="6" width="5" height="9" rx="1.5" fill="#34C48A" transform="rotate(30 90 10)"/><rect x="100" y="40" width="5" height="9" rx="1.5" fill="#4C9BFF" transform="rotate(15 102 44)"/><rect x="8" y="46" width="5" height="9" rx="1.5" fill="#FFC542" transform="rotate(-10 10 50)"/>`;break;
    case 'sleepy':arms=arm(36,86,25)+arm(84,86,-25);face=eyesClosed+`<ellipse cx="60" cy="76" rx="3" ry="2.5" fill="${L}"/>`;extra=`<text x="88" y="34" font-size="14" font-weight="800" fill="${L}" font-family="sans-serif">z</text><text x="98" y="22" font-size="19" font-weight="800" fill="${L}" font-family="sans-serif">Z</text>`;break;
    default:arms=arm(22,84,20)+arm(98,84,-20);face=eyesOpen()+smile;
  }
  const body=`<path d="M60 26c22 0 38 18 38 44 0 22-16 34-38 34S22 92 22 70c0-26 16-44 38-44z" fill="var(--m-body)" stroke="${L}" stroke-width="2.5"/>
   <ellipse cx="60" cy="86" rx="20" ry="14" fill="var(--m-belly)"/>
   <ellipse cx="46" cy="106" rx="9" ry="5" fill="var(--m-body)" stroke="${L}" stroke-width="2.5"/><ellipse cx="74" cy="106" rx="9" ry="5" fill="var(--m-body)" stroke="${L}" stroke-width="2.5"/>
   <path d="M60 27c0-7 1-12 4-16" stroke="${L}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
   <path d="M64 12c4-8 14-9 18-6-3 7-11 10-18 6z" fill="var(--m-leaf)" stroke="${L}" stroke-width="2"/>
   <ellipse cx="40" cy="72" rx="5" ry="3.2" fill="var(--m-cheek)" opacity=".8"/><ellipse cx="80" cy="72" rx="5" ry="3.2" fill="var(--m-cheek)" opacity=".8"/>`;
  return `<svg viewBox="0 0 120 120" role="img" aria-label="Spozli">${extra}${body}${arms}${face}</svg>`;
}
