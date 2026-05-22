// ==========================================
// CONFIGURAÇÕES DO FIREBASE E BACKUP LOCAL
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBR0U8ncxB5mDELgpo20KSNa746-GShtGY",
    authDomain: "iscoolar-4e3fb.firebaseapp.com",
    projectId: "iscoolar-4e3fb",
    storageBucket: "iscoolar-4e3fb.firebasestorage.app",
    messagingSenderId: "791237038299",
    appId: "1:791237038299:web:6050aca69b8706e234fcfe",
    measurementId: "G-LMM4KEC7RH"
};

let db = null, useMock = true, currentUser = null;
let loadedEvents = [], loadedStudents = [], loadedSchools = [], loadedStaff = [], loadedClasses = [], loadedGlobalSubjects = [];
let editingEventId = null, deletingEventId = null, editingStudentId = null, editingSchoolId = null, editingStaffId = null, editingClassId = null, editingGlobalSubjectId = null;
let selectedFileName = null, deleteType = null, globalGradingSystem = "Bimestral";
let currentAdminSchoolId = null, currentGradeStudentId = null, tempAvatarBase64 = null;

const mockDb = {}; // Mock encurtado pois já estamos na nuvem

window.onload = async function() {
    try {
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); db = firebase.firestore(); }
        const doc = await db.collection('global_settings').doc('config').get(); if(doc.exists) globalGradingSystem = doc.data().grading_system || "Bimestral";
        useMock = false;
        document.getElementById('dbStatus').className = "mt-6 p-3 bg-green-50 rounded-lg text-xs text-green-700 text-center flex items-center justify-center gap-2"; document.getElementById('dbStatus').innerHTML = '<i class="ph ph-check-circle text-lg"></i> Conectado ao Firebase!';
    } catch (e) { document.getElementById('dbStatus').className = "mt-6 p-3 bg-red-50 rounded-lg text-xs text-red-700 text-center flex items-center justify-center gap-2"; document.getElementById('dbStatus').innerHTML = '<i class="ph ph-warning text-lg"></i> Erro de Conexão'; }
};

// ==========================================
// CONTROLE DE ACESSO E MENUS (RBAC)
// ==========================================
const navConfig = {
    admin: [ { id: 'management', icon: 'shield-star', label: 'Admin DB', action: "switchAdminTab('schools')" } ],
    director: [ { id: 'home', icon: 'house', label: 'Início', action: 'loadDashboard()' }, { id: 'management', icon: 'briefcase', label: 'Gestão', action: "switchAdminTab('students')" }, { id: 'grades', icon: 'file-text', label: 'Notas', action: 'loadGrades()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'messages', icon: 'chat-circle', label: 'Mural', action: 'loadChat()' } ],
    coordinator: [ { id: 'home', icon: 'house', label: 'Início', action: 'loadDashboard()' }, { id: 'management', icon: 'briefcase', label: 'Gestão', action: "switchAdminTab('students')" }, { id: 'grades', icon: 'file-text', label: 'Notas', action: 'loadGrades()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'messages', icon: 'chat-circle', label: 'Mural', action: 'loadChat()' } ],
    teacher: [ { id: 'grades', icon: 'file-text', label: 'Notas', action: 'loadGrades()' }, { id: 'attendance', icon: 'hand-raising', label: 'Chamada', action: 'loadAttendanceInit()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'messages', icon: 'chat-circle', label: 'Mural', action: 'loadChat()' } ],
    parent: [ { id: 'grades', icon: 'student', label: 'Boletim', action: 'loadGrades()' }, { id: 'attendance', icon: 'list-checks', label: 'Faltas', action: 'loadParentAttendance()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'messages', icon: 'chat-circle', label: 'Recados', action: 'loadChat()' } ]
};

function generateAvatar(name, role) { const seed = name.replace(/\s+/g, '') + role; return `https://api.dicebear.com/8.x/bottts/svg?seed=${seed}&backgroundColor=e2e8f0`; }

async function handleLogin(e) {
    e.preventDefault(); const btn = document.getElementById('btnLoginSubmit'); const orig = btn.innerHTML; btn.innerHTML = '<span class="loader border-t-white w-4 h-4"></span>';
    const email = document.getElementById('loginEmail').value.toLowerCase().trim(); const pass = document.getElementById('loginPassword').value;
    try {
        const q = await db.collection('users').where('email', '==', email).where('password', '==', pass).get(); 
        if(q.empty) throw new Error("Credenciais inválidas"); 
        currentUser = { id: q.docs[0].id, ...q.docs[0].data() }; 
        
        if(!currentUser.avatar_url) currentUser.avatar_url = generateAvatar(currentUser.name, currentUser.role);
        let schoolName = "Plataforma Master";
        if(currentUser.role !== 'admin' && currentUser.school_id) { const doc = await db.collection('schools').doc(currentUser.school_id).get(); if(doc.exists) schoolName = doc.data().name; }
        
        document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('userNameDisplay').innerText = currentUser.name; document.getElementById('userAvatarDisplay').src = currentUser.avatar_url;
        document.getElementById('desktopSidebar').className = "hidden md:flex flex-col w-64 bg-white border-r shadow-sm z-20 shrink-0";
        const labels = {admin:'Administrador', director:'Diretor', coordinator:'Coordenador', teacher:'Professor', parent:'Responsável'};
        document.getElementById('userRoleDisplay').innerText = labels[currentUser.role]; document.getElementById('userSchoolDisplay').innerText = schoolName;
        
        buildNav(currentUser.role); switchTab(navConfig[currentUser.role][0].id); eval(navConfig[currentUser.role][0].action);
        
        if(currentUser.role !== 'admin' && currentUser.role !== 'director') { document.getElementById('eventFormContainer')?.classList.add('hidden'); }
        if(currentUser.role === 'parent') { document.getElementById('gradeFormContainer')?.classList.add('hidden'); document.getElementById('attendanceFormContainer')?.classList.add('hidden'); }
        if(currentUser.role === 'admin') { document.getElementById('adminTabBtn-schools').classList.remove('hidden'); document.getElementById('adminGlobalSchoolSelector').classList.remove('hidden'); document.getElementById('adminGlobalSchoolSelector').classList.add('flex'); populateAdminSchoolsDropdown(); }
    } catch(err) { alert("Falha no Login: " + err.message); } finally { btn.innerHTML = orig; }
}

function buildNav(role) {
    const items = navConfig[role]; const desk = document.getElementById('desktopNavItems'); const mob = document.getElementById('mobileBottomNav'); desk.innerHTML = ''; mob.innerHTML = '';
    items.forEach(item => { desk.innerHTML += `<button id="deskNav-${item.id}" onclick="switchTab('${item.id}'); ${item.action}" class="w-full flex items-center gap-3 p-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition font-medium text-sm"><i class="ph ph-${item.icon} text-xl"></i> ${item.label}</button>`; mob.innerHTML += `<button id="mobNav-${item.id}" onclick="switchTab('${item.id}'); ${item.action}" class="nav-btn"><i class="ph ph-${item.icon} text-2xl mb-0.5"></i><span class="nav-text">${item.label}</span></button>`; });
    mob.classList.remove('hidden'); document.getElementById('appContainer').classList.remove('hidden');
}

function switchTab(viewId) {
    document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden')); document.getElementById(`tab-${viewId}`).classList.remove('hidden');
    navConfig[currentUser.role].forEach(item => {
        let dBtn = document.getElementById(`deskNav-${item.id}`); let mBtn = document.getElementById(`mobNav-${item.id}`);
        if(dBtn && mBtn) { if(item.id === viewId) { dBtn.className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm shadow-sm"; mBtn.className="nav-btn active"; document.getElementById('headerPageTitle').innerText=item.label; } else { dBtn.className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-blue-600 font-medium text-sm"; mBtn.className="nav-btn"; } }
    });
}

function logout() { location.reload(); }

async function getFilteredData(collectionName, orderByField = null) {
    let targetSchool = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id;
    try {
        let ref = db.collection(collectionName);
        if(collectionName !== 'schools' && collectionName !== 'global_subjects') { if(!targetSchool) return []; ref = ref.where('school_id', '==', targetSchool); }
        const snapshot = await ref.get(); let data = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        if(orderByField) { data.sort((a,b) => String(a[orderByField] || '').localeCompare(String(b[orderByField] || ''))); }
        return data;
    } catch (err) { console.error(`Erro ao buscar ${collectionName}:`, err); return []; }
}

async function populateAdminSchoolsDropdown() { 
    const sel = document.getElementById('globalAdminSchoolSelect'); if(!sel) return; 
    let s = await getFilteredData('schools', 'name'); const currentVal = sel.value;
    sel.innerHTML = '<option value="">Selecione a Escola para gerenciar os dados...</option>' + s.map(x=>`<option value="${x.id}">${x.name}</option>`).join(''); 
    if(currentVal) sel.value = currentVal;
}

function changeAdminSchoolContext() { currentAdminSchoolId = document.getElementById('globalAdminSchoolSelect').value; const activeTabBtn = document.querySelector('[id^="adminTabBtn-"].bg-white'); if(activeTabBtn) switchAdminTab(activeTabBtn.id.replace('adminTabBtn-', '')); }

// ==========================================
// MODAL DE PERFIL E RESET DE SENHA
// ==========================================
function openProfileModal() { 
    document.getElementById('profileModal').classList.remove('hidden'); 
    document.getElementById('modalAvatarView').src = currentUser.avatar_url; 
    document.getElementById('modalNameView').innerText = currentUser.name; 
    document.getElementById('modalEmailView').innerText = currentUser.email; 
    document.getElementById('editNameInput').value = currentUser.name;
    document.getElementById('editPassInput').value = currentUser.password; 
    if (currentUser.role !== 'admin') { document.getElementById('editNameInput').readOnly = true; document.getElementById('editNameInput').classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed'); } 
    else { document.getElementById('editNameInput').readOnly = false; document.getElementById('editNameInput').classList.remove('bg-gray-200', 'text-gray-500', 'cursor-not-allowed'); }
    tempAvatarBase64 = null; document.getElementById('profileViewMode').classList.remove('hidden'); document.getElementById('profileEditMode').classList.add('hidden'); 
}
function closeProfileModal() { document.getElementById('profileModal').classList.add('hidden'); }
function toggleProfileEdit() { document.getElementById('profileViewMode').classList.toggle('hidden'); document.getElementById('profileEditMode').classList.toggle('hidden'); }
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) { alert("A imagem deve ter no máximo 2MB."); return; }
        const reader = new FileReader();
        reader.onload = function(e) { tempAvatarBase64 = e.target.result; document.getElementById('modalAvatarView').src = tempAvatarBase64; }
        reader.readAsDataURL(file);
    }
}
async function saveProfileEdits(e) { 
    e.preventDefault(); const p = document.getElementById('editPassInput').value; const n = document.getElementById('editNameInput').value; const btn = document.getElementById('btnSaveProfile'); btn.innerText = "Salvando...";
    let updates = { password: p }; if(currentUser.role === 'admin') updates.name = n; if(tempAvatarBase64) updates.avatar_url = tempAvatarBase64;
    try {
        await db.collection('users').doc(currentUser.id).update(updates); currentUser.password = p;
        if(currentUser.role === 'admin') currentUser.name = n;
        if(tempAvatarBase64) { currentUser.avatar_url = tempAvatarBase64; document.getElementById('userAvatarDisplay').src = tempAvatarBase64; }
        document.getElementById('userNameDisplay').innerText = currentUser.name; alert("Perfil atualizado!"); toggleProfileEdit(); openProfileModal();
    } catch(err) { alert("Erro ao salvar: " + err.message); } finally { btn.innerText = "Salvar Dados"; }
}

async function resetUserPassword(userId) { if(confirm("Deseja realmente resetar a senha deste usuário para '123'?")) { try { await db.collection('users').doc(userId).update({password: '123'}); alert("Senha resetada com sucesso para: 123"); } catch(e) { alert("Erro ao resetar senha."); } } }

async function loadDashboard() {
    let s = await getFilteredData('students'); let u = await getFilteredData('users'); let e = await getFilteredData('events');
    document.getElementById('statStudents').innerText = s.length; document.getElementById('statTeachers').innerText = u.filter(x=>x.role==='teacher'||x.role==='coordinator').length; document.getElementById('statEvents').innerText = e.length;
}

// ==========================================
// GESTÃO
// ==========================================
function switchAdminTab(tab) {
    ['schools', 'students', 'staff', 'classes', 'subjects', 'system'].forEach(t => { const v=document.getElementById(`adminView-${t}`); const b=document.getElementById(`adminTabBtn-${t}`); if(v) v.classList.add('hidden'); if(b) b.classList.remove('bg-white','shadow-sm','text-gray-800'); });
    if(document.getElementById(`adminView-${tab}`)) document.getElementById(`adminView-${tab}`).classList.remove('hidden'); if(document.getElementById(`adminTabBtn-${tab}`)) document.getElementById(`adminTabBtn-${tab}`).classList.add('bg-white','shadow-sm','text-gray-800');
    if(currentUser.role === 'coordinator') { ['adminTabBtn-classes', 'adminTabBtn-subjects', 'adminTabBtn-system'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); }); }
    if(currentUser.role === 'admin' && !currentAdminSchoolId && tab !== 'schools' && tab !== 'subjects') { const view = document.getElementById(`adminView-${tab}`); if(view) view.innerHTML = '<div class="p-6 text-center text-gray-500 font-bold bg-blue-50 rounded-xl border border-blue-100">Por favor, selecione uma escola no menu azul acima primeiro.</div>'; return; } 
    else if(currentUser.role === 'admin' && document.getElementById(`adminView-${tab}`) && document.getElementById(`adminView-${tab}`).innerHTML.includes('Por favor')) { switchTab('management'); location.reload(); }
    if(tab==='schools') loadAdminSchools(); if(tab==='students') loadAdminStudents(); if(tab==='staff') loadAdminStaff(); if(tab==='classes') loadAdminClasses(); if(tab==='subjects') loadAdminSubjects();
}

async function populateSelects() {
    let c = await getFilteredData('classes', 'name'); 
    if((currentUser.role === 'coordinator' || currentUser.role === 'teacher') && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); c = c.filter(cls => myClasses.includes(cls.name)); }
    const opt = '<option value="" disabled selected>Turma...</option>' + c.map(x=>`<option value="${x.name}">${x.name}</option>`).join('');
    ['newStudentClass', 'chatFilter'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = opt; });
    const staffClassContainer = document.getElementById('newStaffClassContainer');
    if(staffClassContainer) { let allC = await getFilteredData('classes', 'name'); staffClassContainer.innerHTML = allC.map(x => `<label class="flex items-center gap-2 cursor-pointer text-xs"><input type="checkbox" class="staff-class-checkbox w-3 h-3 text-emerald-600" value="${x.name}"> ${x.name}</label>`).join(''); }
}

// ESCOLAS
async function loadAdminSchools() { 
    const list=document.getElementById('settingsSchoolsList'); list.innerHTML=''; let s=await getFilteredData('schools', 'name'); loadedSchools=s; 
    if(editingSchoolId === null) document.getElementById('newSchoolId').value = 'escola_' + (s.length + 1); 
    s.forEach(x => { list.innerHTML+=`<li class="p-3 flex justify-between items-center"><div class="flex flex-col"><strong class="text-gray-800">${x.name}</strong><span class="text-[10px] text-gray-500 uppercase">ID: ${x.id} • ${x.cidade||'Sem Cidade'}/${x.estado||'UF'}</span></div><div class="flex gap-2"><button onclick="startEditSchool('${x.id}')" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'school')" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button></div></li>`; }); 
}
async function adminSaveSchool(e) { 
    e.preventDefault(); const btn = document.getElementById('btnSaveSchool'); const originalText = btn.innerText; btn.innerText = 'Salvando...';
    try {
        const id=document.getElementById('newSchoolId').value.trim(); const name=document.getElementById('newSchoolName').value.trim(); const phone=document.getElementById('newSchoolPhone').value; const logradouro=document.getElementById('newSchoolLogradouro').value; const numero=document.getElementById('newSchoolNumero').value; const bairro=document.getElementById('newSchoolBairro').value; const cidade=document.getElementById('newSchoolCidade').value; const estado=document.getElementById('newSchoolEstado').value; const cep=document.getElementById('newSchoolCEP').value; const dName=document.getElementById('newDirName').value.trim(); const dEmail=document.getElementById('newDirEmail').value.trim(); const dPass=document.getElementById('newDirPass').value; 
        const sData = {name, phone, logradouro, numero, bairro, cidade, estado, cep}; 
        if (editingSchoolId === null) { await db.collection('schools').doc(id).set(sData); await db.collection('users').add({email:dEmail, name:dName, role:'director', password:dPass, school_id:id}); alert("Escola e Diretor cadastrados!"); } 
        else { await db.collection('schools').doc(editingSchoolId).update(sData); const q = await db.collection('users').where('school_id','==',editingSchoolId).where('role','==','director').get(); if(!q.empty) await db.collection('users').doc(q.docs[0].id).update({name:dName, email:dEmail, password:dPass}); else await db.collection('users').add({email:dEmail, name:dName, role:'director', password:dPass, school_id:editingSchoolId}); alert("Escola e Diretor atualizados!"); } 
        cancelSchoolEdit(); loadAdminSchools(); populateAdminSchoolsDropdown(); 
    } catch (err) { console.error(err); alert("Falha: " + err.message); } finally { btn.innerText = originalText; }
}
async function startEditSchool(id) { 
    try {
        const sc = loadedSchools.find(x=>x.id===id); if(!sc) return; editingSchoolId = id; 
        document.getElementById('newSchoolId').value = sc.id; document.getElementById('newSchoolId').readOnly = true; 
        ['Name','Phone','Logradouro','Numero','Bairro','Cidade','Estado','CEP'].forEach(f => { if(document.getElementById(`newSchool${f}`)) document.getElementById(`newSchool${f}`).value = sc[f.toLowerCase()]||''; }); 
        const q = await db.collection('users').where('school_id','==',id).where('role','==','director').get(); let dir = null; if(!q.empty) dir = q.docs[0].data();
        if(dir) { document.getElementById('newDirName').value = dir.name; document.getElementById('newDirEmail').value = dir.email; document.getElementById('newDirPass').value = dir.password; } else { document.getElementById('newDirName').value = ''; document.getElementById('newDirEmail').value = ''; document.getElementById('newDirPass').value = ''; }
        document.getElementById('btnSaveSchool').innerText = 'Atualizar Instituição'; document.getElementById('btnCancelSchool').classList.remove('hidden'); document.getElementById('adminView-schools').scrollIntoView({behavior: 'smooth', block: 'start'});
    } catch (err) { alert("Falha ao carregar formulário de edição."); }
}
function cancelSchoolEdit() { editingSchoolId = null; document.getElementById('newSchoolId').readOnly = false; ['Id','Name','Phone','Logradouro','Numero','Bairro','Cidade','Estado','CEP'].forEach(f => { if(document.getElementById(`newSchool${f}`)) document.getElementById(`newSchool${f}`).value=''; }); document.getElementById('newDirName').value=''; document.getElementById('newDirEmail').value=''; document.getElementById('newDirPass').value='123'; document.getElementById('btnSaveSchool').innerText = 'Cadastrar Instituição'; document.getElementById('btnCancelSchool').classList.add('hidden'); loadAdminSchools(); }

// ALUNOS
async function loadAdminStudents() { 
    const list=document.getElementById('settingsStudentsList'); list.innerHTML=''; let s=await getFilteredData('students', 'name'); 
    if (currentUser.role === 'coordinator' && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); s = s.filter(student => myClasses.includes(student.class_name)); }
    loadedStudents=s; const canEdit = currentUser.role === 'admin' || currentUser.role === 'director' || currentUser.role === 'coordinator';
    s.forEach(x => { const actions = canEdit ? `<button onclick="startEditStudent('${x.id}')" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded mr-1"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'student')" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button>` : ''; list.innerHTML+=`<li class="p-3 flex justify-between items-center"><div class="flex flex-col"><strong class="text-gray-800">${x.name}</strong><span class="text-[10px] text-gray-500 uppercase tracking-wide">RA: ${x.id} • ${x.class_name}</span></div><div class="flex gap-1">${actions}</div></li>`; }); 
    populateSelects(); 
}
async function directorSaveStudent(e) { 
    e.preventDefault(); const sid=document.getElementById('newStudentId').value.trim(); const name=document.getElementById('newStudentName').value; const class_name=document.getElementById('newStudentClass').value; const r1e=document.getElementById('newResp1Email').value.trim(); const r1n=document.getElementById('newResp1Name').value; const r1r=document.getElementById('newResp1Rel').value; const schId = currentUser.role==='admin' ? currentAdminSchoolId : currentUser.school_id; 
    if(editingStudentId === null) { await db.collection('students').doc(sid).set({name, class_name, school_id:schId}); await db.collection('users').add({email:r1e, name:`${r1n} (${r1r})`, role:'parent', child_id:sid, password:'123', school_id:schId}); } 
    else { if(sid!==editingStudentId) { await db.collection('students').doc(editingStudentId).delete(); await db.collection('students').doc(sid).set({name, class_name, school_id:schId}); } else await db.collection('students').doc(sid).update({name, class_name, school_id:schId}); } 
    cancelStudentEdit(); loadAdminStudents(); alert("Aluno salvo!"); 
}
function startEditStudent(id) { const s=loadedStudents.find(x=>x.id===id); if(!s) return; editingStudentId=id; document.getElementById('newStudentId').value=s.id; document.getElementById('newStudentName').value=s.name; document.getElementById('newStudentClass').value=s.class_name; document.getElementById('btnSaveStudent').innerText='Atualizar'; document.getElementById('btnCancelStudent').classList.remove('hidden'); document.getElementById('adminView-students').scrollIntoView({behavior:'smooth'}); }
function cancelStudentEdit() { editingStudentId=null; document.getElementById('newStudentId').value=''; document.getElementById('newStudentName').value=''; document.getElementById('newStudentClass').value=''; document.getElementById('btnSaveStudent').innerText='Matricular Aluno'; document.getElementById('btnCancelStudent').classList.add('hidden'); }

// STAFF
async function loadAdminStaff() { 
    const list=document.getElementById('settingsStaffList'); list.innerHTML=''; let u=await getFilteredData('users', 'name'); loadedStaff=u;
    u.filter(x=>x.role!=='parent' && x.role!=='admin').forEach(x => { 
        const canEdit = currentUser.role === 'admin' || currentUser.role === 'director' || (currentUser.role === 'coordinator' && x.role !== 'director');
        let actions = ''; if(canEdit) { actions = `<button onclick="resetUserPassword('${x.id}')" title="Resetar Senha" class="text-amber-500 hover:bg-amber-50 p-1.5 rounded mr-1"><i class="ph ph-key text-lg"></i></button>` + `<button onclick="startEditStaff('${x.id}')" title="Editar Usuário" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded mr-1"><i class="ph ph-pencil-simple text-lg"></i></button>` + `<button onclick="openDeleteModal('${x.id}', 'user')" title="Excluir Usuário" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button>`; }
        list.innerHTML+=`<li class="p-3 flex justify-between items-center"><div class="flex flex-col"><strong class="text-gray-800">${x.name} <span class="bg-gray-200 px-1 rounded text-[9px]">${x.role}</span></strong><span class="text-[10px] text-gray-500">${x.email} • Turma(s): ${x.class_name||'Geral'}</span></div><div class="flex gap-1">${actions}</div></li>`; 
    }); 
    populateSelects();
}
async function directorAddStaff(e) { 
    e.preventDefault(); const role=document.getElementById('newStaffRole').value; const name=document.getElementById('newStaffName').value; const email=document.getElementById('newStaffEmail').value; 
    const checkboxes = document.querySelectorAll('.staff-class-checkbox:checked'); const class_name = Array.from(checkboxes).map(cb => cb.value).join(', ');
    const schId = currentUser.role==='admin' ? currentAdminSchoolId : currentUser.school_id; 
    const p={email, name, role, class_name, password:'123', school_id:schId}; 
    if(editingStaffId === null) { await db.collection('users').add(p); alert("Contratado!"); } else { await db.collection('users').doc(editingStaffId).update({role, name, email, class_name}); alert("Funcionário atualizado!"); }
    cancelStaffEdit(); loadAdminStaff(); 
}
function startEditStaff(id) { const st = loadedStaff.find(x=>x.id===id); if(!st) return; editingStaffId = id; document.getElementById('newStaffRole').value = st.role; document.getElementById('newStaffName').value = st.name; document.getElementById('newStaffEmail').value = st.email; const assigned = (st.class_name || '').split(', '); document.querySelectorAll('.staff-class-checkbox').forEach(cb => { cb.checked = assigned.includes(cb.value); }); document.getElementById('btnSaveStaff').innerText = 'Atualizar'; document.getElementById('btnCancelStaff').classList.remove('hidden'); document.getElementById('adminView-staff').scrollIntoView({behavior:'smooth'}); }
function cancelStaffEdit() { editingStaffId=null; document.getElementById('newStaffRole').value='coordinator'; document.getElementById('newStaffName').value=''; document.getElementById('newStaffEmail').value=''; document.querySelectorAll('.staff-class-checkbox').forEach(cb => cb.checked = false); document.getElementById('btnSaveStaff').innerText='Contratar Funcionário'; document.getElementById('btnCancelStaff').classList.add('hidden'); }

// TURMAS
async function loadAdminClasses() { 
    const list=document.getElementById('settingsClassesList'); list.innerHTML=''; let c=await getFilteredData('classes', 'name'); loadedClasses=c;
    c.forEach(x=>{list.innerHTML+=`<li class="p-3 flex justify-between items-center"><span class="font-bold">${x.name}</span><div class="flex gap-1"><button onclick="startEditClass('${x.id}')" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'class')" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button></div></li>`;}); 
}
async function directorAddClass(e) { 
    e.preventDefault(); const s=document.getElementById('newClassSerie').value.toUpperCase().trim(); const t=document.getElementById('newClassTurma').value.toUpperCase().trim(); const n=`${s} ${t}`; const schId = currentUser.role==='admin' ? currentAdminSchoolId : currentUser.school_id; 
    if(editingClassId === null) { await db.collection('classes').add({serie:s, turma:t, name:n, school_id:schId}); } else { await db.collection('classes').doc(editingClassId).update({serie:s, turma:t, name:n}); }
    cancelClassEdit(); loadAdminClasses(); populateSelects(); 
}
function startEditClass(id) { const cl = loadedClasses.find(x=>x.id===id); if(!cl) return; editingClassId = id; document.getElementById('newClassSerie').value = cl.serie; document.getElementById('newClassTurma').value = cl.turma; document.getElementById('btnSaveClass').innerText = 'Atualizar'; document.getElementById('btnCancelClass').classList.remove('hidden'); document.getElementById('adminView-classes').scrollIntoView({behavior:'smooth'}); }
function cancelClassEdit() { editingClassId=null; document.getElementById('newClassSerie').value=''; document.getElementById('newClassTurma').value=''; document.getElementById('btnSaveClass').innerText='Criar Turma'; document.getElementById('btnCancelClass').classList.add('hidden'); }

// MATÉRIAS
async function loadAdminSubjects() { 
    const adminBlock = document.getElementById('adminGlobalSubjectsBlock'); const schoolBlock = document.getElementById('schoolSubjectsBlock'); const globalList = document.getElementById('globalSubjectsList'); const cbContainer = document.getElementById('subjectsCheckboxContainer');
    let globalSubs = await getFilteredData('global_subjects', 'name'); loadedGlobalSubjects = globalSubs;
    if (currentUser.role === 'admin') { if(adminBlock) { adminBlock.classList.remove('hidden'); adminBlock.classList.add('flex'); } if(globalList) { globalList.innerHTML = ''; globalSubs.forEach(sb => { globalList.innerHTML += `<li class="p-3 flex justify-between items-center font-medium"><span>${sb.name}</span><div class="flex gap-1"><button onclick="startEditGlobalSubject('${sb.id}')" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${sb.id}', 'global_subject')" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button></div></li>`; }); } } else { if(adminBlock) { adminBlock.classList.add('hidden'); adminBlock.classList.remove('flex'); } }
    const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id;
    if (!schId) { if(schoolBlock) schoolBlock.classList.add('hidden'); return; }
    if(schoolBlock) schoolBlock.classList.remove('hidden');
    if(cbContainer) { cbContainer.innerHTML = ''; let schoolSubjects = await getFilteredData('subjects'); let schoolSubNames = schoolSubjects.map(s => s.name); globalSubs.forEach(sub => { const isChecked = schoolSubNames.includes(sub.name) ? 'checked' : ''; cbContainer.innerHTML += `<label class="flex items-center gap-2 p-2 border rounded-lg bg-white cursor-pointer hover:bg-purple-50 transition"><input type="checkbox" class="subject-checkbox w-4 h-4 text-purple-600 rounded" value="${sub.name}" ${isChecked}><span class="text-xs font-medium text-gray-700">${sub.name}</span></label>`; }); }
}

async function adminAddGlobalSubject(e) { e.preventDefault(); const name = document.getElementById('newGlobalSubjectName').value.trim(); if(name) { if(editingGlobalSubjectId === null) { await db.collection('global_subjects').add({name}); } else { await db.collection('global_subjects').doc(editingGlobalSubjectId).update({name}); } cancelGlobalSubjectEdit(); loadAdminSubjects(); } }
function startEditGlobalSubject(id) { const sb = loadedGlobalSubjects.find(x=>x.id===id); if(!sb) return; editingGlobalSubjectId = id; document.getElementById('newGlobalSubjectName').value = sb.name; document.getElementById('btnSaveGlobalSubject').innerText = 'Atualizar'; document.getElementById('btnCancelGlobalSubject').classList.remove('hidden'); }
function cancelGlobalSubjectEdit() { editingGlobalSubjectId = null; document.getElementById('newGlobalSubjectName').value = ''; document.getElementById('btnSaveGlobalSubject').innerText = 'Salvar'; document.getElementById('btnCancelGlobalSubject').classList.add('hidden'); }
async function directorSaveSubjects(e) { e.preventDefault(); const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; const checkboxes = document.querySelectorAll('.subject-checkbox'); const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value); const old = await db.collection('subjects').where('school_id','==',schId).get(); const batch = db.batch(); old.docs.forEach(doc => batch.delete(doc.ref)); selected.forEach(sub => { const newRef = db.collection('subjects').doc(); batch.set(newRef, { name: sub, school_id: schId }); }); await batch.commit(); alert("Grade Curricular da escola atualizada!"); loadAdminSubjects(); }
async function updateGradingSystem() { const val = document.getElementById('globalGradingSystem').value; globalGradingSystem = val; await db.collection('global_settings').doc('config').set({grading_system: val}); alert("Sistema atualizado!"); }

// ==========================================
// CENTRAL DE NOTAS (COM PERÍODOS BASEADO NO SISTEMA)
// ==========================================
async function loadGrades() {
    const isParent = currentUser.role === 'parent';
    document.getElementById('gradeFormContainer')?.classList.add('hidden'); document.getElementById('gradesTableContainer').classList.add('hidden'); document.getElementById('noStudentSelectedMsg').classList.remove('hidden'); document.getElementById('selectedStudentClassLbl').classList.add('hidden'); document.getElementById('gradesStudentList').innerHTML = '';
    
    // Alimenta o Select de Períodos Dinamicamente
    const periodSel = document.getElementById('gradePeriodSelect');
    if (periodSel) {
        periodSel.innerHTML = '<option value="" disabled selected>Período...</option>';
        if (globalGradingSystem === 'Bimestral') [1,2,3,4].forEach(i => periodSel.innerHTML += `<option value="${i}º Bimestre">${i}º Bimestre</option>`);
        else if (globalGradingSystem === 'Trimestral') [1,2,3].forEach(i => periodSel.innerHTML += `<option value="${i}º Trimestre">${i}º Trimestre</option>`);
        else if (globalGradingSystem === 'Semestral') [1,2].forEach(i => periodSel.innerHTML += `<option value="${i}º Semestre">${i}º Semestre</option>`);
    }

    if(isParent) {
        document.getElementById('gradesFilterContainer').classList.add('hidden'); let childIds = String(currentUser.child_id).split(',').map(s=>s.trim()); let stds = await getFilteredData('students', 'name'); let myChildren = stds.filter(s => childIds.includes(String(s.id)));
        myChildren.forEach(s => { document.getElementById('gradesStudentList').innerHTML += `<li onclick="selectStudentForGrades('${s.id}', '${s.name}', '${s.class_name}')" class="student-grade-item p-4 cursor-pointer hover:bg-blue-50 transition border-b flex justify-between items-center text-gray-700 font-bold" id="stdItem-${s.id}"><span><i class="ph ph-user text-gray-400 mr-2"></i>${s.name}</span> <i class="ph ph-caret-right text-gray-300"></i></li>`; });
    } else {
        document.getElementById('gradesFilterContainer').classList.remove('hidden'); let cls = await getFilteredData('classes', 'name'); 
        if((currentUser.role === 'teacher' || currentUser.role === 'coordinator') && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); cls = cls.filter(c => myClasses.includes(c.name)); }
        let sel = document.getElementById('gradesClassSelect'); sel.innerHTML = '<option value="ALL">Todas as Suas Turmas</option>' + cls.map(c => `<option value="${c.name}">${c.name}</option>`).join(''); 
        loadStudentsForGrades(); let subs = await getFilteredData('subjects', 'name'); document.getElementById('gradeSubjectSelect').innerHTML = '<option value="" disabled selected>Matéria...</option>' + subs.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }
}

async function loadStudentsForGrades() { const clsName = document.getElementById('gradesClassSelect').value; const list = document.getElementById('gradesStudentList'); list.innerHTML = '<div class="p-3 text-gray-400 text-xs text-center">Carregando...</div>'; let stds = await getFilteredData('students', 'name'); if((currentUser.role === 'teacher' || currentUser.role === 'coordinator') && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); stds = stds.filter(s => myClasses.includes(s.class_name)); } if(clsName !== 'ALL') stds = stds.filter(s => s.class_name === clsName); list.innerHTML = ''; if(stds.length === 0) list.innerHTML = '<div class="p-3 text-gray-400 text-xs text-center">Nenhum aluno.</div>'; stds.forEach(s => { list.innerHTML += `<li onclick="selectStudentForGrades('${s.id}', '${s.name}', '${s.class_name}')" class="student-grade-item p-3 cursor-pointer hover:bg-blue-50 transition border-b flex justify-between items-center text-gray-700 font-medium" id="stdItem-${s.id}"><span>${s.name}</span> <i class="ph ph-caret-right text-gray-300"></i></li>`; }); }

async function selectStudentForGrades(id, name, className) { currentGradeStudentId = id; document.querySelectorAll('.student-grade-item').forEach(el => el.classList.remove('bg-blue-100', 'text-blue-700', 'border-l-4', 'border-blue-600')); const item = document.getElementById(`stdItem-${id}`); if(item) item.classList.add('bg-blue-100', 'text-blue-700', 'border-l-4', 'border-blue-600'); document.getElementById('noStudentSelectedMsg').classList.add('hidden'); document.getElementById('gradesTableContainer').classList.remove('hidden'); document.getElementById('selectedStudentClassLbl').innerText = className; document.getElementById('selectedStudentClassLbl').classList.remove('hidden'); if(currentUser.role !== 'parent') { document.getElementById('gradeFormContainer').classList.remove('hidden'); document.getElementById('lblSelectedStudentName').innerText = name; } const tbody = document.getElementById('gradesTable'); tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4"><span class="loader w-4 h-4 border-t-blue-500"></span></td></tr>'; let grades = await getFilteredData('grades'); grades = grades.filter(g => g.student_id === id); tbody.innerHTML = ''; if(grades.length === 0) { tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-400">Nenhuma nota lançada.</td></tr>'; return; } grades.reverse().forEach(g => { let c = g.value >= 7 ? 'text-green-600' : 'text-red-600'; const btnDelete = (currentUser.role === 'director' || currentUser.role === 'coordinator' || currentUser.role === 'teacher') ? `<button onclick="openDeleteModal('${g.id}', 'grade')" class="ml-2 text-red-400 hover:text-red-600"><i class="ph ph-trash"></i></button>` : ''; const displayPeriod = g.period || g.date; tbody.innerHTML += `<tr><td class="py-2">${g.subject}</td><td class="py-2 text-gray-500 font-medium">${displayPeriod}</td><td class="py-2 text-right font-black ${c}">${g.value.toFixed(1)} ${btnDelete}</td></tr>`; }); }

async function addGrade(e) { e.preventDefault(); const subject = document.getElementById('gradeSubjectSelect').value; const period = document.getElementById('gradePeriodSelect').value; const value = parseFloat(document.getElementById('gradeInput').value); const date = new Date().toLocaleDateString('pt-BR'); if(!currentGradeStudentId) return; await db.collection('grades').add({ student_id: currentGradeStudentId, subject, period, value, date, school_id: currentUser.school_id }); document.getElementById('gradeInput').value = ''; const sName = document.getElementById('lblSelectedStudentName').innerText; const sClass = document.getElementById('selectedStudentClassLbl').innerText; selectStudentForGrades(currentGradeStudentId, sName, sClass); }

// FREQUÊNCIA, EVENTOS, MENSAGENS
async function loadAttendanceInit() { document.getElementById('attendanceDate').valueAsDate = new Date(); }
async function loadAttendanceClass() { const date=document.getElementById('attendanceDate').value; if(!date) return; const list=document.getElementById('attendanceListForm'); list.innerHTML=''; list.classList.remove('hidden'); let stds=await getFilteredData('students'); stds=stds.filter(s=>s.class_name===currentUser.class_name); stds.forEach(s => { list.innerHTML+=`<div class="flex justify-between items-center bg-white p-2 rounded border"><span class="font-medium text-gray-800">${s.name}</span><div class="flex gap-2"><button onclick="saveAttendance('${s.id}','${date}','Presente', this)" class="px-3 py-1 rounded bg-gray-200 hover:bg-green-500 hover:text-white transition text-xs font-bold">P</button><button onclick="saveAttendance('${s.id}','${date}','Falta', this)" class="px-3 py-1 rounded bg-gray-200 hover:bg-red-500 hover:text-white transition text-xs font-bold">F</button></div></div>`; }); }
async function saveAttendance(stId, date, status, btn) { await db.collection('attendance').add({student_id:stId, date, status, school_id:currentUser.school_id}); btn.parentNode.innerHTML = `<span class="text-[10px] font-bold ${status==='Presente'?'text-green-600':'text-red-600'}">${status}</span>`; }
async function loadParentAttendance() { const list=document.getElementById('attendanceReportList'); list.innerHTML=''; let att=await getFilteredData('attendance'); att=att.filter(a=>a.student_id===currentUser.child_id); if(att.length===0) list.innerHTML='<li class="text-gray-400 py-4 text-center">Nenhum registro de falta.</li>'; else att.forEach(a=>{ list.innerHTML+=`<li class="p-3 border rounded-lg bg-gray-50 flex justify-between"><span>${a.date.split('-').reverse().join('/')}</span><span class="font-bold ${a.status==='Presente'?'text-green-600':'text-red-600'}">${a.status}</span></li>`; }); }

async function loadEvents() { const list=document.getElementById('eventsList')||document.getElementById('parentEventsList'); list.innerHTML=''; let evs=await getFilteredData('events', 'event_date'); loadedEvents=evs; evs.forEach(e => { const d=e.event_date.split('-').reverse().join('/'); const btn = (currentUser.role==='director'||currentUser.role==='coordinator'||currentUser.role==='admin')?`<button onclick="openDeleteModal('${e.id}', 'event')" class="text-red-500"><i class="ph ph-trash text-lg"></i></button>`:''; list.innerHTML+=`<div class="p-3 border rounded-xl bg-white shadow-sm flex gap-4 mb-2"><div class="bg-emerald-50 text-emerald-800 rounded-lg p-2 text-center w-14 shrink-0"><p class="text-xs font-black">${d.substring(0,5)}</p></div><div class="flex-grow"><strong class="text-gray-800 block">${e.title}</strong><p class="text-[10px] text-gray-500">${e.description||''}</p></div>${btn}</div>`; }); }
async function handleEventSubmit(e) { e.preventDefault(); const t=document.getElementById('eventTitleInput').value; const d=document.getElementById('eventDateInput').value; const h=document.getElementById('eventTimeInput').value; const c=document.getElementById('eventDescInput').value; await db.collection('events').add({title:t, event_date:d, event_time:h, description:c, school_id:currentUser.school_id}); e.target.reset(); loadEvents(); }

function handleFileSelection(role) { const fileInput = document.getElementById(`${role}ChatFileInput`); if (fileInput.files.length > 0) { selectedFileName = fileInput.files[0].name; document.getElementById(`${role}FileNameDisplay`).innerText = selectedFileName; document.getElementById(`${role}ClearFileBtn`).classList.remove('hidden'); } }
function clearFileSelection(role) { selectedFileName = null; document.getElementById(`${role}ChatFileInput`).value = ''; document.getElementById(`${role}FileNameDisplay`).innerText = 'Anexar Documento'; document.getElementById(`${role}ClearFileBtn`).classList.add('hidden'); }
async function sendMessage(e) { e.preventDefault(); const isProf = currentUser.role === 'teacher'; const role = isProf ? 'prof' : 'parent'; const input = document.getElementById(`${role}ChatMessageInput`); const text = input.value.trim(); if (!text && !selectedFileName) return; const p={sender_name:currentUser.name, sender_role:currentUser.role, message_text:text, file_name:selectedFileName, timestamp:Date.now(), school_id:currentUser.school_id}; await db.collection('messages').add(p); input.value=''; clearFileSelection(role); await loadMessages(); }
async function loadChat() { const box=document.getElementById('chatMessagesBox')||document.getElementById('parentChatBox'); if(!box) return; box.innerHTML=''; let msgs=await getFilteredData('messages', 'timestamp'); msgs.forEach(m => { const isMe=m.sender_name===currentUser.name; const c=isMe?'ml-auto bg-purple-600 text-white':'mr-auto bg-white text-gray-800 border shadow-sm'; const b=m.file_name?`<div class="mt-1 p-1.5 rounded bg-black/10 text-[10px] cursor-pointer"><i class="ph ph-paperclip"></i> ${m.file_name}</div>`:''; box.innerHTML+=`<div class="max-w-[85%] p-3 rounded-2xl text-xs ${c} mb-2 fade-in"><span class="text-[10px] font-bold block mb-1 uppercase tracking-wide opacity-70">${m.sender_name}</span><p class="leading-relaxed">${m.message_text || ''}</p>${b}</div>`; }); box.scrollTop=box.scrollHeight; }

function openDeleteModal(id, type) { deletingEventId = id; deleteType = type; document.getElementById('deleteModal').classList.remove('hidden'); }
function closeDeleteModal() { deletingEventId = null; deleteType = null; document.getElementById('deleteModal').classList.add('hidden'); }
async function executeDeleteEvent() {
    const col = deleteType==='user'?'users':(deleteType==='student'?'students':(deleteType==='class'?'classes':(deleteType==='subject'?'subjects':(deleteType==='school'?'schools':(deleteType==='grade'?'grades':(deleteType==='global_subject'?'global_subjects':'events'))))));
    if(deleteType==='user') { await db.collection('users').doc(deletingEventId).delete(); } 
    else await db.collection(col).doc(deletingEventId).delete();
    
    closeDeleteModal(); 
    if(deleteType==='event') loadEvents(); 
    if(deleteType==='student') loadAdminStudents(); 
    if(deleteType==='user') loadAdminStaff(); 
    if(deleteType==='class') loadAdminClasses(); 
    if(deleteType==='subject' || deleteType==='global_subject') loadAdminSubjects();
    if(deleteType==='school') { loadAdminSchools(); populateAdminSchoolsDropdown(); }
    if(deleteType==='grade') { const sName = document.getElementById('lblSelectedStudentName').innerText; const sClass = document.getElementById('selectedStudentClassLbl').innerText; selectStudentForGrades(currentGradeStudentId, sName, sClass); }
}