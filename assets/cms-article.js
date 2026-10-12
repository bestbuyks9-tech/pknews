import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';
const supabase = createClient('https://hsamxerpalcjzzddgyiq.supabase.co','sb_publishable_564LLK4MbolZAPqykqtJGw_Yef_fXXH');
const root = document.getElementById('articleRoot');
const slug = new URLSearchParams(location.search).get('slug');
const el = (tag, cls, value) => { const node=document.createElement(tag); if(cls)node.className=cls; if(value!==undefined)node.textContent=value; return node; };
if (!slug) { root.replaceChildren(el('h1','article-error','Nuk u specifikua artikulli.'), Object.assign(el('a','article-back','← Kthehu në ballinë'),{href:'/'})); }
else {
 const {data: article,error}=await supabase.from('articles').select('title,slug,summary,body,category,image_url,published_at,created_at,status').eq('slug',slug).eq('status','published').maybeSingle();
 if(error || !article) { root.replaceChildren(el('h1','article-error','Artikulli nuk u gjet.'), Object.assign(el('a','article-back','← Kthehu në ballinë'),{href:'/'})); }
 else {
  document.title=article.title+' | PK Online';
  const back=Object.assign(el('a','article-back','← Kthehu në ballinë'),{href:'/'});
  const category=el('div','article-kicker',({kosovo:'Kosova',politika:'Politikë',ekonomi:'Ekonomi',bota:'Bota',sport:'Sport',teknologji:'Teknologji'})[article.category]||article.category);
  const title=el('h1','article-title',article.title);
  const date=el('div','article-meta',new Intl.DateTimeFormat('sq-XK',{day:'numeric',month:'long',year:'numeric'}).format(new Date(article.published_at||article.created_at)));
  const nodes=[back,category,title,date];
  if(article.image_url){const img=el('img','article-hero');img.src=article.image_url;img.alt=article.title;nodes.push(img);}
  if(article.summary)nodes.push(el('p','article-summary',article.summary));
  nodes.push(el('div','article-body',article.body));
  root.replaceChildren(...nodes);
 }
}
