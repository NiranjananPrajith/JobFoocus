const applications = [
  {company:'Figma',title:'Product Designer',location:'San Francisco · Hybrid',category:'Product design',status:'prospect',docs:0,date:'Saved Oct 10',tint:'#f1e6f3'},
  {company:'Vercel',title:'Frontend Engineer',location:'Remote',category:'Engineering',status:'prospect',docs:2,date:'Saved Oct 9',tint:'#eeeae5'},
  {company:'Notion',title:'Senior Product Designer',location:'New York · Hybrid',category:'Product design',status:'applied',docs:2,date:'Applied Oct 1',followup:true,tint:'#eceae6'},
  {company:'Linear',title:'Product Engineer',location:'Remote',category:'Engineering',status:'applied',docs:2,date:'Applied Sep 30',followup:true,tint:'#eae7fa'},
  {company:'Stripe',title:'Product Designer',location:'Remote',category:'Product design',status:'interview',docs:2,date:'Updated Oct 8',tint:'#ede5fb'},
  {company:'Canva',title:'Design Engineer',location:'London · Hybrid',category:'Engineering',status:'interview',docs:2,date:'Updated Oct 9',tint:'#def2ec'},
  {company:'Miro',title:'Product Designer',location:'Amsterdam · Hybrid',category:'Product design',status:'offer',docs:2,date:'Updated Oct 10',tint:'#f8efd0'},
  {company:'Dropbox',title:'UX Designer',location:'Remote',category:'Uncategorized',status:'rejected',docs:2,date:'Updated Oct 4',tint:'#e3ecfa'}
];
const statuses=[['prospect','Prospect','Saved for later','#a89889'],['applied','Applied','Application sent','#7e9db7'],['interview','Interview','In conversation','#d6a24f'],['offer','Offer','An offer received','#7e9f80'],['rejected','Rejected','Closed applications','#c18e89']];
let followupsOnly=false;
const search=document.querySelector('#search');
const category=document.querySelector('#category');
function render(){
  const query=search.value.toLowerCase().trim();
  const rows=applications.filter(a=>(a.company+' '+a.title).toLowerCase().includes(query)&&(category.value==='all'||a.category===category.value)&&(!followupsOnly||a.followup));
  document.querySelector('#board').innerHTML=statuses.map(([status,label,description,color])=>{
    const jobs=rows.filter(a=>a.status===status);
    return `<section class="lane" style="--status:${color}" aria-label="${label}"><div class="lane-heading"><span class="status-dot" aria-hidden="true"></span><h3>${label}</h3><span class="count">${jobs.length}</span></div><p class="lane-description">${description}</p>${jobs.map(a=>`<article class="job-card"><div class="company"><span class="company-icon" style="--tint:${a.tint}" aria-hidden="true">${a.company[0]}</span>${a.company}</div><h4>${a.title}</h4><p class="location">${a.location}</p><span class="tag">${a.category}</span><p class="docs">${a.docs?'▤ Resume + cover letter':'No documents yet'}</p><div class="card-bottom"><span>${a.date}</span>${a.followup?'<span class="follow-up">Follow up</span>':''}</div></article>`).join('')||'<div class="lane-empty">No applications here</div>'}</section>`;
  }).join('');
  document.querySelector('#result-count').textContent=rows.length;
  document.querySelector('#empty').hidden=rows.length>0;
  document.querySelector('#board').hidden=rows.length===0;
  document.querySelector('#reset').hidden=!query&&category.value==='all'&&!followupsOnly;
  document.querySelector('#filter-note').textContent=followupsOnly?'Showing applications that need a follow-up. Clear filters to see all roles.':'';
}
function reset(){search.value='';category.value='all';followupsOnly=false;render();}
search.addEventListener('input',render);category.addEventListener('change',render);
document.querySelector('#reset').addEventListener('click',reset);document.querySelector('#empty-reset').addEventListener('click',reset);
document.querySelector('#followup-filter').addEventListener('click',()=>{search.value='';category.value='all';followupsOnly=true;render();document.querySelector('.pipeline').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
render();
