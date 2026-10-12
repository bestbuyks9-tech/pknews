import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';

const SUPABASE_URL = 'https://hsamxerpalcjzzddgyiq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_564LLK4MbolZAPqykqtJGw_Yef_fXXH';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const state = { user: null, profile: null, articles: [], selectedId: null, filter: 'all' };
const labels = { draft: 'Draft', pending_review: 'Në shqyrtim', published: 'Publikuar', archived: 'Arkivuar' };
const categories = { kosovo: 'Kosova', politika: 'Politikë', ekonomi: 'Ekonomi', bota: 'Bota', sport: 'Sport', teknologji: 'Teknologji' };

function message(el, text, good = false) {
  el.textContent = text || '';
  el.classList.toggle('success', Boolean(good));
}
function slugify(value) {
  return value.toLocaleLowerCase('sq').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ë/g, 'e').replace(/ç/g, 'c').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function showLogin(text = '') {
  $('loginView').hidden = false;
  $('appView').hidden = true;
  message($('loginMessage'), text);
}
function statusLabel(status) { return labels[status] || status; }
function canManage() { return ['admin', 'manager'].includes(state.profile?.role); }
function clearEditor() {
  state.selectedId = null;
  $('articleForm').reset();
  $('editorTitle').textContent = 'Artikull i ri';
  $('editorEyebrow').textContent = 'ARTIKULL I RI';
  $('statusPill').textContent = 'Draft';
  $('statusPill').className = 'pill';
  message($('editorMessage'), '');
  $('publishBtn').hidden = !canManage();
  $('submitBtn').hidden = canManage();
  $('saveDraftBtn').hidden = false;
  $('deleteBtn').hidden = true;
  $('deleteBtn').disabled = true;
  setFormEnabled(true);
  renderArticles();
}
function setFormEnabled(enabled) {
  $('articleForm').querySelectorAll('input,textarea,select').forEach(el => el.disabled = !enabled);
  $('saveDraftBtn').disabled = !enabled;
  $('submitBtn').disabled = !enabled;
  $('publishBtn').disabled = !enabled;
}
function renderArticles() {
  const query = $('articleSearch').value.trim().toLocaleLowerCase();
  const list = state.articles.filter(a => (state.filter === 'all' || a.status === state.filter) && (!query || a.title.toLocaleLowerCase().includes(query) || a.slug.includes(query)));
  $('articleList').innerHTML = '';
  if (!list.length) {
    $('articleList').innerHTML = '<div class="empty">Nuk ka artikuj për këtë filtër.</div>';
    return;
  }
  list.forEach(a => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'article-item' + (state.selectedId === a.id ? ' active' : '');
    const title = document.createElement('strong'); title.textContent = a.title || '(Pa titull)';
    const meta = document.createElement('span'); meta.textContent = (categories[a.category] || a.category) + ' · ' + statusLabel(a.status);
    button.append(title, meta);
    button.addEventListener('click', () => loadArticleIntoEditor(a));
    $('articleList').append(button);
  });
}
function renderStats() {
  $('statTotal').textContent = state.articles.length;
  $('statReview').textContent = state.articles.filter(a => a.status === 'pending_review').length;
  $('statPublished').textContent = state.articles.filter(a => a.status === 'published').length;
}
function loadArticleIntoEditor(a) {
  state.selectedId = a.id;
  $('title').value = a.title || '';
  $('slug').value = a.slug || '';
  $('summary').value = a.summary || '';
  $('body').value = a.body || '';
  $('category').value = a.category || 'kosovo';
  $('imageUrl').value = a.image_url || '';
  $('editorTitle').textContent = a.title || 'Artikull pa titull';
  $('editorEyebrow').textContent = 'EDITO ARTIKULLIN';
  $('statusPill').textContent = statusLabel(a.status);
  $('statusPill').className = 'pill ' + a.status;
  message($('editorMessage'), '');
  const editable = canManage() || (a.created_by === state.user.id && ['draft','pending_review'].includes(a.status));
  setFormEnabled(editable);
  $('publishBtn').hidden = !canManage();
  $('submitBtn').hidden = canManage();
  $('saveDraftBtn').hidden = !editable;
  $('deleteBtn').hidden = !canManage();
  $('deleteBtn').disabled = !canManage();
  $('publishBtn').disabled = !editable;
  $('submitBtn').disabled = !editable;
  if (!editable) message($('editorMessage'), 'Ky artikull është vetëm për lexim. Vetëm autori mund të ndryshojë draftet e veta; menaxheri ose administratori mund të ndryshojë çdo artikull.');
  renderArticles();
}
async function loadArticles() {
  const { data, error } = await supabase.from('articles').select('id,title,slug,summary,body,category,image_url,status,created_by,updated_by,published_at,created_at,updated_at').order('updated_at', { ascending: false });
  if (error) throw error;
  state.articles = data || [];
  renderStats(); renderArticles();
}
async function loadUsers() {
  if (state.profile.role !== 'admin') return;
  $('usersPanel').hidden = false;
  const { data, error } = await supabase.from('profiles').select('user_id,email,display_name,role,created_at').order('created_at', { ascending: true });
  if (error) throw error;
  const wrap = $('usersList'); wrap.innerHTML = '';
  (data || []).forEach(person => {
    const row = document.createElement('div'); row.className = 'user-row';
    const info = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = person.display_name || person.email || person.user_id;
    const email = document.createElement('span'); email.textContent = person.email || '';
    info.append(name, email);
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Roli për ' + (person.email || person.user_id));
    [['editor','Editor'],['manager','Manager'],['admin','Admin']].forEach(([value,label]) => {
      const option = document.createElement('option'); option.value = value; option.textContent = label; option.selected = person.role === value; select.append(option);
    });
    select.addEventListener('change', async () => {
      select.disabled = true;
      const { error: updateError } = await supabase.from('profiles').update({ role: select.value }).eq('user_id', person.user_id);
      if (updateError) { alert('Roli nuk u ruajt: ' + updateError.message); select.value = person.role; }
      else { person.role = select.value; }
      select.disabled = false;
    });
    if (person.user_id === state.user.id) select.disabled = true;
    row.append(info, select); wrap.append(row);
  });
}
async function enterApp(user) {
  state.user = user;
  const { data: profile, error } = await supabase.from('profiles').select('user_id,email,display_name,role').eq('user_id', user.id).single();
  if (error || !profile) {
    await supabase.auth.signOut();
    showLogin('Profili nuk u gjet. Kontakto administratorin e PK Online.');
    return;
  }
  state.profile = profile;
  $('loginView').hidden = true; $('appView').hidden = false;
  $('usersPanel').hidden = profile.role !== 'admin';
  $('userLine').textContent = (profile.display_name || profile.email || 'Përdorues') + ' · ' + profile.role.toUpperCase();
  $('publishBtn').hidden = !canManage();
  $('submitBtn').hidden = canManage();
  try { await loadArticles(); await loadUsers(); }
  catch (error) { message($('editorMessage'), 'Gabim gjatë ngarkimit: ' + error.message); }
  clearEditor();
}
async function deleteArticle() {
  if (!canManage() || !state.selectedId) return;
  const article = state.articles.find(a => a.id === state.selectedId);
  if (!article) return;
  if (!window.confirm('A je i sigurt që dëshiron ta fshish përgjithmonë artikullin "' + article.title + '"? Ky veprim nuk mund të zhbëhet.')) return;
  const button = $('deleteBtn');
  button.disabled = true;
  message($('editorMessage'), 'Duke fshirë artikullin…');
  const { error } = await supabase.from('articles').delete().eq('id', state.selectedId).select('id').single();
  if (error) {
    message($('editorMessage'), 'Artikulli nuk u fshi: ' + error.message);
    button.disabled = false;
    return;
  }
  await loadArticles();
  clearEditor();
  message($('editorMessage'), 'Artikulli u fshi me sukses.', true);
}
async function saveArticle(status) {
  message($('editorMessage'), '');
  const title = $('title').value.trim();
  const slug = $('slug').value.trim();
  const body = $('body').value.trim();
  if (!title || !slug || !body) {
    message($('editorMessage'), 'Plotëso titullin, slug-un dhe përmbajtjen.');
    return;
  }
  if (status === 'published' && !canManage()) {
    message($('editorMessage'), 'Vetëm menaxheri ose administratori mund të publikojë.');
    return;
  }
  const existing = state.articles.find(a => a.id === state.selectedId);
  const record = {
    title, slug, summary: $('summary').value.trim(), body,
    category: $('category').value, image_url: $('imageUrl').value.trim() || null,
    status, updated_by: state.user.id,
    published_at: status === 'published' ? (existing?.published_at || new Date().toISOString()) : null
  };
  let result;
  if (state.selectedId) {
    result = await supabase.from('articles').update(record).eq('id', state.selectedId).select('id').single();
  } else {
    result = await supabase.from('articles').insert({ ...record, created_by: state.user.id }).select('id').single();
  }
  if (result.error) {
    message($('editorMessage'), 'Nuk u ruajt: ' + result.error.message);
    return;
  }
  message($('editorMessage'), status === 'published' ? 'Artikulli u publikua në databazë.' : status === 'pending_review' ? 'Artikulli u dërgua për miratim.' : 'Drafti u ruajt.', true);
  const savedId = result.data.id;
  await loadArticles();
  const saved = state.articles.find(a => a.id === savedId);
  if (saved) loadArticleIntoEditor(saved);
}
$('loginForm').addEventListener('submit', async event => {
  event.preventDefault(); message($('loginMessage'), 'Duke hyrë…');
  const { data, error } = await supabase.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
  if (error) { message($('loginMessage'), 'Hyrja dështoi. Kontrollo emailin dhe fjalëkalimin.'); return; }
  await enterApp(data.user);
});
$('logoutBtn').addEventListener('click', async () => { await supabase.auth.signOut(); state.user = null; state.profile = null; showLogin(''); });
$('newBtn').addEventListener('click', clearEditor);
$('title').addEventListener('input', () => { if (!state.selectedId && !$('slug').value.trim()) $('slug').value = slugify($('title').value); });
$('slug').addEventListener('input', () => { $('slug').value = slugify($('slug').value); });
$('saveDraftBtn').addEventListener('click', () => saveArticle('draft'));
$('submitBtn').addEventListener('click', () => saveArticle('pending_review'));
$('publishBtn').addEventListener('click', () => saveArticle('published'));
$('deleteBtn').addEventListener('click', deleteArticle);
$('articleSearch').addEventListener('input', renderArticles);
document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
  state.filter = btn.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === btn));
  renderArticles();
}));

const { data: { session } } = await supabase.auth.getSession();
if (session?.user) await enterApp(session.user);
else showLogin('');
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user && state.user?.id !== session.user.id) queueMicrotask(() => enterApp(session.user));
});
