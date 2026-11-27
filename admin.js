'use strict';
const repo='rodrigocostalimajus-lab/marinacoutoadvocaciainss',apiBase='https://api.github.com/repos/'+repo;
const slots={hero:'Foto principal – retrato preto',sobre:'Sobre a advogada – retrato claro',logo:'Logomarca – cabeçalho e rodapé',office:'Sala de atendimento',team:'Ambiente de trabalho',entry:'Área de acesso',facade:'Fachada do imóvel'};
const fields={oab:'OAB',city:'Cidade / UF',whatsapp:'WhatsApp (DDI + DDD + número)',phone:'Telefone',email:'E-mail',address:'Endereço',instagram:'Instagram (URL)',linkedin:'LinkedIn (URL)',facebook:'Facebook (URL)'};
const initialTexts={oab:'OAB/GO 56.049',city:'Goiânia/GO',whatsapp:'5562992844334',phone:'(62) 99284-4334',email:'contato@marinacouto.adv.br',address:'Setor Universitário, Goiânia/GO',instagram:'',linkedin:'',facebook:''};
const defaults={texts:initialTexts,photos:Object.fromEntries(Object.keys(slots).map(k=>[k,{enabled:true,path:'img/marina-'+k+'.jpg'}])),revision:'1'};
const $=id=>document.getElementById(id);let token='',head='',draft=structuredClone(defaults),pending={},busy=false,ready=false,processing=0;
function status(s,error=false){$('status').textContent=s;$('status').classList.toggle('error',error);}
function buttons(){
document.body.classList.toggle(
    'admin-locked', !(ready && token)
);
 $('publish').disabled=busy||!ready||!token||processing>0;$('connect').disabled=busy;$('disconnect').disabled=busy;$('restore').disabled=busy||!ready||processing>0;}
function safePath(s){return typeof s==='string'&&/^img\/[a-z0-9-]+\.jpg$/.test(s);}
function render(){const root=$('photo-grid');root.replaceChildren();for(const [key,label] of Object.entries(slots)){const card=document.createElement('article');card.className='photo'+(draft.photos[key].enabled?'':' off');const title=document.createElement('h3');title.textContent=label;const img=document.createElement('img');img.alt=label;img.src=pending[key]?.data||(safePath(draft.photos[key].path)?draft.photos[key].path+'?v='+encodeURIComponent(draft.revision||'1'):'');const check=document.createElement('input');check.type='checkbox';check.checked=!!draft.photos[key].enabled;const cl=document.createElement('label');cl.append(check,' Exibir no site');check.onchange=()=>{draft.photos[key].enabled=check.checked;card.classList.toggle('off',!check.checked);};const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp,image/avif';file.onchange=()=>select(key,file.files[0]);const reset=document.createElement('button');reset.textContent='Usar original';reset.onclick=()=>{delete pending[key];draft.photos[key]=structuredClone(defaults.photos[key]);render();};card.append(title,img,cl,file,reset);card.ondragover=e=>{e.preventDefault();card.classList.add('drop');};card.ondragleave=()=>card.classList.remove('drop');card.ondrop=e=>{e.preventDefault();card.classList.remove('drop');select(key,e.dataTransfer.files[0]);};root.append(card);}
const tr=$('text-grid');tr.replaceChildren();for(const [k,label] of Object.entries(fields)){const wrap=document.createElement('label');wrap.textContent=label;const inp=document.createElement('input');inp.type=k==='email'?'email':(['instagram','linkedin','facebook'].includes(k)?'url':'text');inp.value=draft.texts[k]||'';inp.oninput=()=>draft.texts[k]=inp.value.trim();wrap.append(inp);tr.append(wrap);}buttons();}
async function select(k,file){if(busy||!file)return;if(!file.type.startsWith('image/')||file.size>20*1024*1024){status('Selecione uma imagem de até 20 MB.',true);return;}processing++;buttons();try{const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const data=canvas.toDataURL('image/jpeg',.86);pending[k]={data};draft.photos[k].enabled=true;render();status('Foto preparada. Salve e publique para todos os visitantes.');}catch(e){status('Não foi possível abrir a imagem.',true);}finally{processing--;buttons();}}
async function request(path,method='GET',body){const response=await fetch(apiBase+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});if(!response.ok)throw Error('GitHub HTTP '+response.status+' — '+(response.status===403?'permissão insuficiente ou limite de API':response.status===401?'token inválido':'verifique o repositório e a conexão'));return response.json();}
function from64(s){return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),x=>x.charCodeAt(0)));}
function to64(s){const a=new TextEncoder().encode(s);let chunks=[];for(let i=0;i<a.length;i+=8192)chunks.push(String.fromCharCode(...a.subarray(i,i+8192)));return btoa(chunks.join(''));}
function normalize(c){const out=structuredClone(defaults);for(const k of Object.keys(fields))if(typeof c.texts?.[k]==='string')out.texts[k]=c.texts[k];for(const k of Object.keys(slots)){const p=c.photos?.[k];if(p&&safePath(p.path))out.photos[k]={path:p.path,enabled:p.enabled!==false};}out.revision=String(c.revision||'1');return out;}
$('eye').onclick=()=>{$('token').type=$('token').type==='password'?'text':'password';$('eye').textContent=$('token').type==='password'?'Mostrar':'Ocultar';};
$('connect').onclick=async()=>{if(busy)return;const t=$('token').value.trim();if(!t){status('Informe o token.',true);return;}if((Object.keys(pending).length||ready)&&!confirm('Conectar carrega a versão atual do GitHub e descarta edições não publicadas. Continuar?'))return;ready=false;token=t;$('token').value='';$('token').type='password';$('eye').textContent='Mostrar';busy=true;buttons();try{
const auth=await fetch('https://api.github.com/user',{
headers:{
Authorization:'Bearer '+token,
Accept:'application/vnd.github+json'
},
cache:'no-store'
});
if(!auth.ok)throw Error('Credencial invalida.');
const account=await auth.json();
if(account.login!=='rodrigocostalimajus-lab'){
throw Error('Conta nao autorizada.');
}
const r=await request('/git/ref/heads/main');head=r.object.sha;const cfg=await request('/contents/personalizacao.json?ref='+encodeURIComponent(head));draft=normalize(JSON.parse(from64(cfg.content)));pending={};ready=true;render();status('Conectado ao repositório. As alterações serão publicadas na branch main.');}catch(e){token='';head='';status(e.message,true);}finally{busy=false;buttons();}};
$('disconnect').onclick=()=>{ready=false;pending={};token='';head='';$('token').value='';$('token').type='password';$('eye').textContent='Mostrar';buttons();status('Desconectado. O token não foi armazenado.');};

function exitAdmin(event){
    if(event)event.preventDefault();
    token='';
    head='';
    ready=false;
    pending={};
    document.body.classList.add('admin-locked');
    document.getElementById('token').value='';
    window.location.replace(window.location.origin + '/');
}
$('exit-admin').onclick=exitAdmin;
$('exit-bottom').onclick=exitAdmin;

window.addEventListener('pageshow',e=>{
    if(e.persisted)location.reload();
});

$('restore').onclick=()=>{if(confirm('Restaurar textos e imagens originais na prévia?')){draft=structuredClone(defaults);pending={};render();status('Padrões restaurados na prévia. Publique para aplicar.');}};
$('publish').onclick=async()=>{if(busy||!token||processing)return;if(!/^\d{10,15}$/.test(draft.texts.whatsapp)){status('WhatsApp deve conter 10 a 15 dígitos.',true);return;}for(const k of ['instagram','linkedin','facebook'])if(draft.texts[k]){try{if(new URL(draft.texts[k]).protocol!=='https:')throw Error();}catch{status('Use um endereço HTTPS válido em '+fields[k]+'.',true);return;}}if(!confirm('Publicar estas alterações para todos os visitantes?'))return;busy=true;buttons();try{status('Verificando versão e criando publicação…');const current=(await request('/git/ref/heads/main')).object.sha;if(current!==head)throw Error('O repositório mudou. Reconecte e revise antes de publicar.');const parent=await request('/git/commits/'+head);const config=structuredClone(draft);const changes=[];for(const [k,p] of Object.entries(pending)){const path='img/personalizada-'+k+'.jpg';const blob=await request('/git/blobs','POST',{content:p.data.split(',')[1],encoding:'base64'});changes.push({path,mode:'100644',type:'blob',sha:blob.sha});config.photos[k].path=path;}config.revision=String(Date.now());const configBlob=await request('/git/blobs','POST',{content:to64(JSON.stringify(config,null,2)+'\n'),encoding:'base64'});changes.push({path:'personalizacao.json',mode:'100644',type:'blob',sha:configBlob.sha});const tree=await request('/git/trees','POST',{base_tree:parent.tree.sha,tree:changes});const commit=await request('/git/commits','POST',{message:'Atualizar personalização Marina Couto',tree:tree.sha,parents:[head]});await request('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});head=commit.sha;draft=config;pending={};render();status('Alterações salvas no GitHub. Confira a implantação em Actions; a atualização pública depende do GitHub Pages.');}catch(e){status(e.message+' — Nenhuma publicação foi confirmada pelo painel.',true);}finally{busy=false;buttons();}};
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{for(const x of document.querySelectorAll('[data-tab]')){$(x.dataset.tab).hidden=x!==b;x.setAttribute('aria-selected',String(x===b));}};

ready=false;
buttons();
status('Informe sua credencial para entrar no painel.');
$('token').addEventListener('keydown',e=>{
if(e.key==='Enter')$('connect').click();
});
