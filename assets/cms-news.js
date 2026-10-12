import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';

const supabase = createClient('https://hsamxerpalcjzzddgyiq.supabase.co','sb_publishable_564LLK4MbolZAPqykqtJGw_Yef_fXXH');
const labels = { kosovo:['Kosova','Kosovo'], politika:['Politikë','Politics'], ekonomi:['Ekonomi','Economy'], bota:['Bota','World'], sport:['Sport','Sports'], teknologji:['Teknologji','Technology'] };
const symbols = { kosovo:'🇽🇰', politika:'⚖', ekonomi:'€', bota:'🌍', sport:'⚽', teknologji:'⌘' };
function makeCard(article) {
  const card=document.createElement('a'); card.className='story-card'; card.href='/lajme/?slug='+encodeURIComponent(article.slug);
  const cover=document.createElement('div'); cover.className='cover-art'; cover.setAttribute('data-symbol',symbols[article.category]||'PK');
  if(article.image_url){
    const image=document.createElement('img'); image.className='cover-art-image'; image.src=article.image_url; image.alt=article.title; image.loading='lazy';
    image.onerror=()=>image.remove(); cover.prepend(image);
  }
  const tag=document.createElement('span'); tag.className='cover-art-label'; tag.textContent=(labels[article.category]||[article.category,article.category])[document.documentElement.lang==='en'?1:0]; cover.append(tag);
  const body=document.createElement('div'); body.className='story-card-body';
  const meta=document.createElement('div'); meta.className='story-card-meta';
  const date=document.createElement('span'); date.textContent=new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-GB':'sq-XK',{day:'numeric',month:'long',year:'numeric'}).format(new Date(article.published_at||article.created_at));
  const minutes=document.createElement('span'); minutes.textContent=Math.max(1,Math.ceil(String(article.body||'').split(' ').filter(Boolean).length/200))+(document.documentElement.lang==='en'?' min read':' min lexim'); meta.append(date,minutes);
  const title=document.createElement('h3'); title.textContent=article.title;
  const summary=document.createElement('p'); summary.textContent=article.summary||String(article.body||'').slice(0,180)+'…';
  const more=document.createElement('div'); more.className='story-card-more'; more.textContent=document.documentElement.lang==='en'?'READ ARTICLE ↗':'LEXO ARTIKULLIN ↗';
  body.append(meta,title,summary,more); card.append(cover,body); return card;
}
async function loadPublishedNews() {
  const {data,error}=await supabase.from('articles').select('id,title,slug,summary,body,category,image_url,status,published_at,created_at').eq('status','published').order('published_at',{ascending:false,nullsFirst:false});
  if(error){console.error('PK Online: published news could not load',error.message);return;}
  let path=location.pathname;
  if(path.length>1&&path.endsWith('/'))path=path.slice(0,-1);
  const category=({'/kosovo':'kosovo','/politika':'politika','/ekonomi':'ekonomi','/bota':'bota','/sport':'sport','/teknologji':'teknologji'})[path];
  let items=data||[]; if(category)items=items.filter(article=>article.category===category);
  const grid=document.querySelector('main .news-grid'); if(!grid||!items.length)return;
  const fragment=document.createDocumentFragment(); items.forEach(article=>fragment.appendChild(makeCard(article))); grid.prepend(fragment);
}
loadPublishedNews();
