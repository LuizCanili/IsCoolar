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
let loadedEvents = [], loadedStudents = [], loadedSchools = [], loadedStaff = [], loadedClasses = [], loadedGlobalSubjects = [], loadedMessages = [];
let editingEventId = null, deletingEventId = null, editingStudentId = null, editingSchoolId = null, editingStaffId = null, editingClassId = null, editingGlobalSubjectId = null;
let selectedFileName = null, selectedFileBase64 = null, deleteType = null;
let currentSchoolGradingSystem = "Bimestral"; 
let currentAdminSchoolId = null, currentGradeStudentId = null, tempAvatarBase64 = null;
let currentGradeStudentName = "", currentGradeStudentClass = "", currentStudentGrades = [], currentStudentFaltas = 0;
window.chatAttachments = {}; 

const mockDb = {}; 

window.onload = async function() {
    try {
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); db = firebase.firestore(); }
        useMock = false;
        document.getElementById('dbStatus').className = "mt-6 p-3 bg-green-50 rounded-lg text-xs text-green-700 text-center flex items-center justify-center gap-2"; document.getElementById('dbStatus').innerHTML = '<i class="ph ph-check-circle text-lg"></i> Conectado';
    } catch (e) { document.getElementById('dbStatus').className = "mt-6 p-3 bg-red-50 rounded-lg text-xs text-red-700 text-center flex items-center justify-center gap-2"; document.getElementById('dbStatus').innerHTML = '<i class="ph ph-warning text-lg"></i> Erro de Conexão'; }
};

// ==========================================
// CONTROLE DE ACESSO E MENUS (RBAC)
// ==========================================
const navConfig = {
    admin: [ { id: 'management', icon: 'shield-star', label: 'Admin DB', action: "switchAdminTab('schools')" } ],
    director: [ { id: 'home', icon: 'house', label: 'Início', action: 'loadDashboard()' }, { id: 'management', icon: 'briefcase', label: 'Gestão', action: "switchAdminTab('students')" }, { id: 'grades', icon: 'file-text', label: 'Notas', action: 'loadGrades()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'messages', icon: 'chat-circle', label: 'Mural', action: 'loadChat()' } ],
    coordinator: [ { id: 'home', icon: 'house', label: 'Início', action: 'loadDashboard()' }, { id: 'management', icon: 'briefcase', label: 'Gestão', action: "switchAdminTab('students')" }, { id: 'grades', icon: 'file-text', label: 'Notas', action: 'loadGrades()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'messages', icon: 'chat-circle', label: 'Mural', action: 'loadChat()' } ],
    teacher: [ { id: 'grades', icon: 'file-text', label: 'Notas', action: 'loadGrades()' }, { id: 'attendance', icon: 'list-checks', label: 'Chamada', action: 'loadAttendanceInit()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'messages', icon: 'chat-circle', label: 'Mural', action: 'loadChat()' } ],
    parent: [ { id: 'grades', icon: 'student', label: 'Boletim', action: 'loadGrades()' }, { id: 'attendance', icon: 'list-checks', label: 'Faltas', action: 'loadParentAttendance()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'messages', icon: 'chat-circle', label: 'Recados', action: 'loadChat()' } ]
};

const roleLabels = { admin: "Administrador", director: "Diretor(a)", coordinator: "Coordenador(a)", teacher: "Professor(a)", parent: "Responsável" };

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
        if(currentUser.role !== 'admin' && currentUser.school_id) { 
            const doc = await db.collection('schools').doc(currentUser.school_id).get(); 
            if(doc.exists) { schoolName = doc.data().name; currentSchoolGradingSystem = doc.data().grading_system || "Bimestral"; }
        }
        document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('userInfo').classList.remove('hidden');
        document.getElementById('userNameDisplay').innerText = currentUser.name; document.getElementById('userAvatarDisplay').src = currentUser.avatar_url;
        document.getElementById('desktopSidebar').className = "hidden md:flex flex-col w-64 bg-white border-r shadow-sm z-20 shrink-0";
        document.getElementById('userRoleDisplay').innerText = roleLabels[currentUser.role]; document.getElementById('userSchoolDisplay').innerText = schoolName;
        
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
        if(orderByField) { 
            data.sort((a,b) => {
                const valA = a[orderByField]; const valB = b[orderByField];
                if(typeof valA === 'number' && typeof valB === 'number') return valA - valB;
                return String(valA || '').localeCompare(String(valB || ''));
            }); 
        }
        return data;
    } catch (err) { console.error(`Erro ao buscar ${collectionName}:`, err); return []; }
}

async function populateAdminSchoolsDropdown() { 
    const sel = document.getElementById('globalAdminSchoolSelect'); if(!sel) return; 
    let s = await getFilteredData('schools', 'name'); const currentVal = sel.value;
    sel.innerHTML = '<option value="">Selecione a Escola para gerenciar os dados...</option>' + s.map(x=>`<option value="${x.id}">${x.name}</option>`).join(''); 
    if(currentVal) sel.value = currentVal;
}

async function changeAdminSchoolContext() { 
    currentAdminSchoolId = document.getElementById('globalAdminSchoolSelect').value; 
    if(currentAdminSchoolId) { const doc = await db.collection('schools').doc(currentAdminSchoolId).get(); if(doc.exists) currentSchoolGradingSystem = doc.data().grading_system || "Bimestral"; }
    const activeTabBtn = document.querySelector('[id^="adminTabBtn-"].bg-white'); if(activeTabBtn) switchAdminTab(activeTabBtn.id.replace('adminTabBtn-', '')); 
}

// ==========================================
// MODAL DE PERFIL
// ==========================================
function openProfileModal() { 
    document.getElementById('profileModal').classList.remove('hidden'); document.getElementById('modalAvatarView').src = currentUser.avatar_url; document.getElementById('modalNameView').innerText = currentUser.name; document.getElementById('modalEmailView').innerText = currentUser.email; document.getElementById('editNameInput').value = currentUser.name; document.getElementById('editPassInput').value = currentUser.password; 
    if (currentUser.role !== 'admin') { document.getElementById('editNameInput').readOnly = true; document.getElementById('editNameInput').classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed'); } else { document.getElementById('editNameInput').readOnly = false; document.getElementById('editNameInput').classList.remove('bg-gray-200', 'text-gray-500', 'cursor-not-allowed'); }
    tempAvatarBase64 = null; document.getElementById('profileViewMode').classList.remove('hidden'); document.getElementById('profileEditMode').classList.add('hidden'); 
}
function closeProfileModal() { document.getElementById('profileModal').classList.add('hidden'); }
function toggleProfileEdit() { document.getElementById('profileViewMode').classList.toggle('hidden'); document.getElementById('profileEditMode').classList.toggle('hidden'); }
function handleImageUpload(event) { const file = event.target.files[0]; if (file) { if (file.size > 2 * 1024 * 1024) { alert("A imagem deve ter no máximo 2MB."); return; } const reader = new FileReader(); reader.onload = function(e) { tempAvatarBase64 = e.target.result; document.getElementById('modalAvatarView').src = tempAvatarBase64; }; reader.readAsDataURL(file); } }
async function saveProfileEdits(e) { e.preventDefault(); const p = document.getElementById('editPassInput').value; const n = document.getElementById('editNameInput').value; const btn = document.getElementById('btnSaveProfile'); btn.innerText = "Salvando..."; let updates = { password: p }; if(currentUser.role === 'admin') updates.name = n; if(tempAvatarBase64) updates.avatar_url = tempAvatarBase64; try { await db.collection('users').doc(currentUser.id).update(updates); currentUser.password = p; if(currentUser.role === 'admin') currentUser.name = n; if(tempAvatarBase64) { currentUser.avatar_url = tempAvatarBase64; document.getElementById('userAvatarDisplay').src = tempAvatarBase64; } document.getElementById('userNameDisplay').innerText = currentUser.name; alert("Perfil atualizado!"); toggleProfileEdit(); openProfileModal(); } catch(err) { alert("Erro: " + err.message); } finally { btn.innerText = "Salvar Dados"; } }

async function resetUserPassword(userId) { if(confirm("Deseja realmente resetar a senha deste usuário para '123'?")) { try { await db.collection('users').doc(userId).update({password: '123'}); alert("Senha resetada com sucesso para: 123"); } catch(e) { alert("Erro ao resetar senha."); } } }

async function loadDashboard() { let s = await getFilteredData('students'); let u = await getFilteredData('users'); let e = await getFilteredData('events'); document.getElementById('statStudents').innerText = s.length; document.getElementById('statTeachers').innerText = u.filter(x=>x.role==='teacher'||x.role==='coordinator').length; document.getElementById('statEvents').innerText = e.length; }

// ==========================================
// GESTÃO GERAL
// ==========================================
function switchAdminTab(tab) {
    ['schools', 'students', 'staff', 'classes', 'subjects', 'system'].forEach(t => { const v=document.getElementById(`adminView-${t}`); const b=document.getElementById(`adminTabBtn-${t}`); if(v) { v.classList.add('hidden'); Array.from(v.children).forEach(child => { if(child.id !== 'adminSchoolWarning') child.style.display = ''; }); const warning = v.querySelector('#adminSchoolWarning'); if(warning) warning.remove(); } if(b) b.classList.remove('bg-white','shadow-sm','text-gray-800'); });
    const activeView = document.getElementById(`adminView-${tab}`); if(activeView) activeView.classList.remove('hidden'); if(document.getElementById(`adminTabBtn-${tab}`)) document.getElementById(`adminTabBtn-${tab}`).classList.add('bg-white','shadow-sm','text-gray-800');
    if(currentUser.role === 'coordinator') { ['adminTabBtn-classes', 'adminTabBtn-subjects', 'adminTabBtn-system'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); }); }
    if(currentUser.role === 'admin' && !currentAdminSchoolId && tab !== 'schools' && tab !== 'system') { if(activeView) { Array.from(activeView.children).forEach(child => child.style.display = 'none'); const warningMsg = document.createElement('div'); warningMsg.id = 'adminSchoolWarning'; warningMsg.className = 'p-6 text-center text-blue-600 font-bold bg-blue-50 rounded-xl border border-blue-200 mt-2'; warningMsg.innerHTML = '<i class="ph ph-info text-xl align-middle mr-1"></i> Por favor, selecione uma escola no menu azul acima primeiro.'; activeView.appendChild(warningMsg); } return; } 
    if(tab==='system') document.getElementById('globalGradingSystem').value = currentSchoolGradingSystem;
    if(tab==='schools') loadAdminSchools(); if(tab==='students') loadAdminStudents(); if(tab==='staff') loadAdminStaff(); if(tab==='classes') loadAdminClasses(); if(tab==='subjects') loadAdminSubjects();
}

async function populateSelects() {
    let c = await getFilteredData('classes', 'name'); if((currentUser.role === 'coordinator' || currentUser.role === 'teacher') && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); c = c.filter(cls => myClasses.includes(cls.name)); }
    const opt = '<option value="" disabled selected>Turma...</option>' + c.map(x=>`<option value="${x.name}">${x.name}</option>`).join('');
    ['newStudentClass'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = opt; });
    const roleSelect = document.getElementById('newStaffRole'); if(roleSelect) { if(currentUser.role === 'coordinator') { roleSelect.innerHTML = '<option value="teacher">Professor</option>'; } else { roleSelect.innerHTML = '<option value="coordinator">Coordenador</option><option value="teacher">Professor</option>'; } }
    const staffClassContainer = document.getElementById('newStaffClassContainer'); if(staffClassContainer) { let allC = await getFilteredData('classes', 'name'); staffClassContainer.innerHTML = allC.map(x => `<label class="flex items-center gap-2 cursor-pointer text-xs"><input type="checkbox" class="staff-class-checkbox w-3 h-3 text-emerald-600" value="${x.name}"> ${x.name}</label>`).join(''); }
}

async function loadAdminSchools() { const list=document.getElementById('settingsSchoolsList'); list.innerHTML=''; let s=await getFilteredData('schools', 'name'); loadedSchools=s; if(editingSchoolId === null) document.getElementById('newSchoolId').value = 'escola_' + (s.length + 1); s.forEach(x => { list.innerHTML+=`<li class="p-3 flex justify-between items-center"><div class="flex flex-col"><strong class="text-gray-800">${x.name}</strong><span class="text-[10px] text-gray-500 uppercase">ID: ${x.id} • ${x.cidade||'Sem Cidade'}/${x.estado||'UF'}</span></div><div class="flex gap-2"><button onclick="startEditSchool('${x.id}')" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'school')" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button></div></li>`; }); }
async function adminSaveSchool(e) { e.preventDefault(); const btn = document.getElementById('btnSaveSchool'); const originalText = btn.innerText; btn.innerText = 'Salvando...'; try { const id=document.getElementById('newSchoolId').value.trim(); const name=document.getElementById('newSchoolName').value.trim(); const phone=document.getElementById('newSchoolPhone').value; const logradouro=document.getElementById('newSchoolLogradouro').value; const numero=document.getElementById('newSchoolNumero').value; const bairro=document.getElementById('newSchoolBairro').value; const cidade=document.getElementById('newSchoolCidade').value; const estado=document.getElementById('newSchoolEstado').value; const cep=document.getElementById('newSchoolCEP').value; const dName=document.getElementById('newDirName').value.trim(); const dEmail=document.getElementById('newDirEmail').value.trim(); const dPass=document.getElementById('newDirPass').value; const sData = {name, phone, logradouro, numero, bairro, city: cidade, estado, cep}; if (editingSchoolId === null) { sData.grading_system = 'Bimestral'; await db.collection('schools').doc(id).set(sData); await db.collection('users').add({email:dEmail, name:dName, role:'director', password:dPass, school_id:id}); alert("Escola e Diretor cadastrados!"); } else { await db.collection('schools').doc(editingSchoolId).update(sData); const q = await db.collection('users').where('school_id','==',editingSchoolId).where('role','==','director').get(); if(!q.empty) await db.collection('users').doc(q.docs[0].id).update({name:dName, email:dEmail, password:dPass}); else await db.collection('users').add({email:dEmail, name:dName, role:'director', password:dPass, school_id:editingSchoolId}); alert("Escola e Diretor atualizados!"); } cancelSchoolEdit(); loadAdminSchools(); populateAdminSchoolsDropdown(); } catch (err) { console.error(err); alert("Falha: " + err.message); } finally { btn.innerText = originalText; } }
async function startEditSchool(id) { try { const sc = loadedSchools.find(x=>x.id===id); if(!sc) return; editingSchoolId = id; document.getElementById('newSchoolId').value = sc.id; document.getElementById('newSchoolId').readOnly = true; ['Name','Phone','Logradouro','Numero','Bairro','Cidade','Estado','CEP'].forEach(f => { if(document.getElementById(`newSchool${f}`)) document.getElementById(`newSchool${f}`).value = sc[f.toLowerCase()]||''; }); const q = await db.collection('users').where('school_id','==',id).where('role','==','director').get(); let dir = null; if(!q.empty) dir = q.docs[0].data(); if(dir) { document.getElementById('newDirName').value = dir.name; document.getElementById('newDirEmail').value = dir.email; document.getElementById('newDirPass').value = dir.password; } else { document.getElementById('newDirName').value = ''; document.getElementById('newDirEmail').value = ''; document.getElementById('newDirPass').value = '123'; } document.getElementById('btnSaveSchool').innerText = 'Atualizar Instituição'; document.getElementById('btnCancelSchool').classList.remove('hidden'); document.getElementById('adminView-schools').scrollIntoView({behavior: 'smooth', block: 'start'}); } catch (err) { alert("Falha ao carregar formulário de edição."); } }
function cancelSchoolEdit() { editingSchoolId = null; document.getElementById('newSchoolId').readOnly = false; ['Id','Name','Phone','Logradouro','Numero','Bairro','Cidade','Estado','CEP'].forEach(f => { if(document.getElementById(`newSchool${f}`)) document.getElementById(`newSchool${f}`).value=''; }); document.getElementById('newDirName').value=''; document.getElementById('newDirEmail').value=''; document.getElementById('newDirPass').value='123'; document.getElementById('btnSaveSchool').innerText = 'Cadastrar Instituição'; document.getElementById('btnCancelSchool').classList.add('hidden'); loadAdminSchools(); }

async function loadAdminStudents() { const list = document.getElementById('settingsStudentsList'); list.innerHTML = ''; let allStudents = await getFilteredData('students', 'name'); let allUsers = await getFilteredData('users'); if (editingStudentId === null) { let maxNum = 0; allStudents.forEach(st => { if(st.id && st.id.startsWith('ALUNO_')) { let num = parseInt(st.id.replace('ALUNO_', ''), 10); if(!isNaN(num) && num > maxNum) maxNum = num; } }); let nextId = 'ALUNO_' + String(maxNum + 1).padStart(3, '0'); const idInput = document.getElementById('newStudentId'); idInput.value = nextId; idInput.readOnly = true; idInput.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed'); } let s = allStudents; if (currentUser.role === 'coordinator' && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); s = s.filter(student => myClasses.includes(student.class_name)); } loadedStudents = s; const canEdit = currentUser.role === 'admin' || currentUser.role === 'director' || currentUser.role === 'coordinator'; s.forEach(x => { const actions = canEdit ? `<button onclick="startEditStudent('${x.id}')" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded mr-1"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'student')" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button>` : ''; let parents = allUsers.filter(u => u.role === 'parent' && u.child_id === x.id); let parentsText = parents.length > 0 ? parents.map(p => p.name).join(' | ') : 'Sem responsáveis'; list.innerHTML+=`<li class="p-3 flex justify-between items-center"><div class="flex flex-col"><strong class="text-gray-800">${x.name}</strong><span class="text-[10px] text-gray-500 uppercase tracking-wide">RA: ${x.id} • ${x.class_name}</span><span class="text-[10px] text-gray-400 mt-1"><i class="ph ph-users align-middle"></i> ${parentsText}</span></div><div class="flex gap-1">${actions}</div></li>`; }); populateSelects(); }
async function directorSaveStudent(e) { e.preventDefault(); const sid = document.getElementById('newStudentId').value.trim(); const name = document.getElementById('newStudentName').value; const class_name = document.getElementById('newStudentClass').value; const r1e = document.getElementById('newResp1Email').value.trim(); const r1n = document.getElementById('newResp1Name').value; const r1r = document.getElementById('newResp1Rel').value; const r2e = document.getElementById('newResp2Email').value.trim(); const r2n = document.getElementById('newResp2Name').value; const r2r = document.getElementById('newResp2Rel').value; const schId = currentUser.role==='admin' ? currentAdminSchoolId : currentUser.school_id; if(editingStudentId === null) { await db.collection('students').doc(sid).set({name, class_name, school_id:schId}); await db.collection('users').add({email:r1e, name:`${r1n} (${r1r})`, role:'parent', child_id:sid, password:'123', school_id:schId}); if(r2e && r2n) { await db.collection('users').add({email:r2e, name:`${r2n} (${r2r || 'Responsável 2'})`, role:'parent', child_id:sid, password:'123', school_id:schId}); } } else { if(sid!==editingStudentId) { await db.collection('students').doc(editingStudentId).delete(); await db.collection('students').doc(sid).set({name, class_name, school_id:schId}); } else { await db.collection('students').doc(sid).update({name, class_name, school_id:schId}); } const parentQuery = await db.collection('users').where('role', '==', 'parent').where('child_id', '==', editingStudentId).get(); let parentDocs = parentQuery.docs; if (parentDocs[0]) { await db.collection('users').doc(parentDocs[0].id).update({email: r1e, name: `${r1n} (${r1r})`, child_id: sid}); } else { await db.collection('users').add({email:r1e, name:`${r1n} (${r1r})`, role:'parent', child_id:sid, password:'123', school_id:schId}); } if (r2e && r2n) { if (parentDocs[1]) { await db.collection('users').doc(parentDocs[1].id).update({email: r2e, name: `${r2n} (${r2r || 'Responsável 2'})`, child_id: sid}); } else { await db.collection('users').add({email:r2e, name:`${r2n} (${r2r || 'Responsável 2'})`, role:'parent', child_id:sid, password:'123', school_id:schId}); } } else if (parentDocs[1] && (!r2e || !r2n)) { await db.collection('users').doc(parentDocs[1].id).delete(); } } cancelStudentEdit(); alert("Aluno matriculado/atualizado com sucesso!"); }
async function startEditStudent(id) { const s = loadedStudents.find(x=>x.id===id); if(!s) return; editingStudentId=id; const idInput = document.getElementById('newStudentId'); idInput.value = s.id; idInput.readOnly = true; idInput.classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed'); document.getElementById('newStudentName').value = s.name; document.getElementById('newStudentClass').value = s.class_name; const parentQuery = await db.collection('users').where('role', '==', 'parent').where('child_id', '==', id).get(); let parents = parentQuery.docs.map(doc => doc.data()); if (parents[0]) { document.getElementById('newResp1Email').value = parents[0].email || ''; let match = parents[0].name.match(/(.*?)\s*\((.*?)\)/); if(match) { document.getElementById('newResp1Name').value = match[1].trim(); document.getElementById('newResp1Rel').value = match[2].trim(); } else { document.getElementById('newResp1Name').value = parents[0].name; document.getElementById('newResp1Rel').value = ''; } } if (parents[1]) { document.getElementById('newResp2Email').value = parents[1].email || ''; let match = parents[1].name.match(/(.*?)\s*\((.*?)\)/); if(match) { document.getElementById('newResp2Name').value = match[1].trim(); document.getElementById('newResp2Rel').value = match[2].trim(); } else { document.getElementById('newResp2Name').value = parents[1].name; document.getElementById('newResp2Rel').value = ''; } } document.getElementById('btnSaveStudent').innerText = 'Atualizar'; document.getElementById('btnCancelStudent').classList.remove('hidden'); document.getElementById('adminView-students').scrollIntoView({behavior:'smooth'}); }
function cancelStudentEdit() { editingStudentId=null; ['newStudentName','newStudentClass','newResp1Email','newResp1Rel','newResp1Name','newResp2Email','newResp2Rel','newResp2Name'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ''; }); document.getElementById('btnSaveStudent').innerText='Matricular Aluno'; document.getElementById('btnCancelStudent').classList.add('hidden'); loadAdminStudents(); }

async function loadAdminStaff() { const list=document.getElementById('settingsStaffList'); list.innerHTML=''; let u=await getFilteredData('users', 'name'); loadedStaff=u; u.filter(x=>x.role!=='parent' && x.role!=='admin').forEach(x => { const canEdit = currentUser.role === 'admin' || currentUser.role === 'director' || (currentUser.role === 'coordinator' && x.role !== 'director' && x.role !== 'coordinator'); let actions = ''; if(canEdit) { actions = `<button onclick="resetUserPassword('${x.id}')" title="Resetar Senha" class="text-amber-500 hover:bg-amber-50 p-1.5 rounded mr-1"><i class="ph ph-key text-lg"></i></button><button onclick="startEditStaff('${x.id}')" title="Editar Usuário" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded mr-1"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'user')" title="Excluir Usuário" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button>`; } list.innerHTML+=`<li class="p-3 flex justify-between items-center"><div class="flex flex-col"><strong class="text-gray-800">${x.name} <span class="bg-gray-200 px-1 rounded text-[9px]">${x.role}</span></strong><span class="text-[10px] text-gray-500">${x.email} • Turma(s): ${x.class_name||'Geral'}</span></div><div class="flex gap-1">${actions}</div></li>`; }); populateSelects(); }
async function directorAddStaff(e) { e.preventDefault(); const role=document.getElementById('newStaffRole').value; const name=document.getElementById('newStaffName').value; const email=document.getElementById('newStaffEmail').value; const checkboxes = document.querySelectorAll('.staff-class-checkbox:checked'); const class_name = Array.from(checkboxes).map(cb => cb.value).join(', '); const schId = currentUser.role==='admin' ? currentAdminSchoolId : currentUser.school_id; const p={email, name, role, class_name, password:'123', school_id:schId}; if(editingStaffId === null) { await db.collection('users').add(p); alert("Contratado!"); } else { await db.collection('users').doc(editingStaffId).update({role, name, email, class_name}); alert("Funcionário atualizado!"); } cancelStaffEdit(); loadAdminStaff(); }
function startEditStaff(id) { const st = loadedStaff.find(x=>x.id===id); if(!st) return; editingStaffId = id; document.getElementById('newStaffRole').value = st.role; document.getElementById('newStaffName').value = st.name; document.getElementById('newStaffEmail').value = st.email; const assigned = (st.class_name || '').split(', '); document.querySelectorAll('.staff-class-checkbox').forEach(cb => { cb.checked = assigned.includes(cb.value); }); document.getElementById('btnSaveStaff').innerText = 'Atualizar'; document.getElementById('btnCancelStaff').classList.remove('hidden'); document.getElementById('adminView-staff').scrollIntoView({behavior:'smooth'}); }
function cancelStaffEdit() { editingStaffId=null; document.getElementById('newStaffRole').value='coordinator'; document.getElementById('newStaffName').value=''; document.getElementById('newStaffEmail').value=''; document.querySelectorAll('.staff-class-checkbox').forEach(cb => cb.checked = false); document.getElementById('btnSaveStaff').innerText='Contratar Funcionário'; document.getElementById('btnCancelStaff').classList.add('hidden'); }
async function loadAdminClasses() { const list=document.getElementById('settingsClassesList'); list.innerHTML=''; let c=await getFilteredData('classes', 'name'); loadedClasses=c; c.forEach(x=>{list.innerHTML+=`<li class="p-3 flex justify-between items-center"><span class="font-bold">${x.name}</span><div class="flex gap-1"><button onclick="startEditClass('${x.id}')" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'class')" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button></div></li>`;}); }
async function directorAddClass(e) { e.preventDefault(); const s=document.getElementById('newClassSerie').value.toUpperCase().trim(); const t=document.getElementById('newClassTurma').value.toUpperCase().trim(); const n=`${s} ${t}`; const schId = currentUser.role==='admin' ? currentAdminSchoolId : currentUser.school_id; if(editingClassId === null) { await db.collection('classes').add({serie:s, turma:t, name:n, school_id:schId}); } else { await db.collection('classes').doc(editingClassId).update({serie:s, turma:t, name:n}); } cancelClassEdit(); loadAdminClasses(); populateSelects(); }
function startEditClass(id) { const cl = loadedClasses.find(x=>x.id===id); if(!cl) return; editingClassId = id; document.getElementById('newClassSerie').value = cl.serie; document.getElementById('newClassTurma').value = cl.turma; document.getElementById('btnSaveClass').innerText = 'Atualizar'; document.getElementById('btnCancelClass').classList.remove('hidden'); document.getElementById('adminView-classes').scrollIntoView({behavior:'smooth'}); }
function cancelClassEdit() { editingClassId=null; document.getElementById('newClassSerie').value=''; document.getElementById('newClassTurma').value=''; document.getElementById('btnSaveClass').innerText='Criar Turma'; document.getElementById('btnCancelClass').classList.add('hidden'); }
async function loadAdminSubjects() { const adminBlock = document.getElementById('adminGlobalSubjectsBlock'); const schoolBlock = document.getElementById('schoolSubjectsBlock'); const globalList = document.getElementById('globalSubjectsList'); const cbContainer = document.getElementById('subjectsCheckboxContainer'); let globalSubs = await getFilteredData('global_subjects', 'name'); loadedGlobalSubjects = globalSubs; if (currentUser.role === 'admin') { if(adminBlock) { adminBlock.classList.remove('hidden'); adminBlock.classList.add('flex'); } if(globalList) { globalList.innerHTML = ''; globalSubs.forEach(sb => { globalList.innerHTML += `<li class="p-3 flex justify-between items-center font-medium"><span>${sb.name}</span><div class="flex gap-1"><button onclick="startEditGlobalSubject('${sb.id}')" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${sb.id}', 'global_subject')" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button></div></li>`; }); } } else { if(adminBlock) { adminBlock.classList.add('hidden'); adminBlock.classList.remove('flex'); } } const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; if (!schId) { if(schoolBlock) schoolBlock.classList.add('hidden'); return; } if(schoolBlock) schoolBlock.classList.remove('hidden'); if(cbContainer) { cbContainer.innerHTML = ''; let schoolSubjects = await getFilteredData('subjects'); let schoolSubNames = schoolSubjects.map(s => s.name); globalSubs.forEach(sub => { const isChecked = schoolSubNames.includes(sub.name) ? 'checked' : ''; cbContainer.innerHTML += `<label class="flex items-center gap-2 p-2 border rounded-lg bg-white cursor-pointer hover:bg-purple-50 transition"><input type="checkbox" class="subject-checkbox w-4 h-4 text-purple-600 rounded" value="${sub.name}" ${isChecked}><span class="text-xs font-medium text-gray-700">${sub.name}</span></label>`; }); } }
async function adminAddGlobalSubject(e) { e.preventDefault(); const name = document.getElementById('newGlobalSubjectName').value.trim(); if(name) { if(editingGlobalSubjectId === null) { await db.collection('global_subjects').add({name}); } else { await db.collection('global_subjects').doc(editingGlobalSubjectId).update({name}); } cancelGlobalSubjectEdit(); loadAdminSubjects(); } }
function startEditGlobalSubject(id) { const sb = loadedGlobalSubjects.find(x=>x.id===id); if(!sb) return; editingGlobalSubjectId = id; document.getElementById('newGlobalSubjectName').value = sb.name; document.getElementById('btnSaveGlobalSubject').innerText = 'Atualizar'; document.getElementById('btnCancelGlobalSubject').classList.remove('hidden'); }
function cancelGlobalSubjectEdit() { editingGlobalSubjectId = null; document.getElementById('newGlobalSubjectName').value = ''; document.getElementById('btnSaveGlobalSubject').innerText = 'Salvar'; document.getElementById('btnCancelGlobalSubject').classList.add('hidden'); }
async function directorSaveSubjects(e) { e.preventDefault(); const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; const checkboxes = document.querySelectorAll('.subject-checkbox'); const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value); const old = await db.collection('subjects').where('school_id','==',schId).get(); const batch = db.batch(); old.docs.forEach(doc => batch.delete(doc.ref)); selected.forEach(sub => { const newRef = db.collection('subjects').doc(); batch.set(newRef, { name: sub, school_id: schId }); }); await batch.commit(); alert("Grade Curricular da escola atualizada!"); loadAdminSubjects(); }
async function updateGradingSystem() { const val = document.getElementById('globalGradingSystem').value; currentSchoolGradingSystem = val; const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; if(!schId) return alert("Selecione uma escola primeiro."); await db.collection('schools').doc(schId).update({grading_system: val}); alert("Sistema de avaliação atualizado para esta escola!"); }

// ==========================================
// CENTRAL DE NOTAS E FREQUÊNCIA COM BOLETIM PDF
// ==========================================
async function loadGrades() { 
    const isParent = currentUser.role === 'parent'; 
    document.getElementById('gradeFormContainer')?.classList.add('hidden'); document.getElementById('gradesTableContainer').classList.add('hidden'); document.getElementById('noStudentSelectedMsg').classList.remove('hidden'); document.getElementById('selectedStudentClassLbl').classList.add('hidden'); document.getElementById('gradesStudentList').innerHTML = ''; document.getElementById('lblGradingSystem').innerText = "Boletim " + currentSchoolGradingSystem; 
    
    // Alimenta Seletor do Form e Filtro de Visualização
    const periodSel = document.getElementById('gradePeriodSelect'); 
    const viewPeriodSel = document.getElementById('viewGradePeriodSelect');
    if (periodSel) { 
        periodSel.innerHTML = '<option value="" disabled selected>Período...</option>'; 
        if(viewPeriodSel) viewPeriodSel.innerHTML = '<option value="ALL">Todos os Períodos</option>';
        if (currentSchoolGradingSystem === 'Bimestral') [1,2,3,4].forEach(i => { periodSel.innerHTML += `<option value="${i}º Bimestre">${i}º Bimestre</option>`; if(viewPeriodSel) viewPeriodSel.innerHTML += `<option value="${i}º Bimestre">${i}º Bimestre</option>`; }); 
        else if (currentSchoolGradingSystem === 'Trimestral') [1,2,3].forEach(i => { periodSel.innerHTML += `<option value="${i}º Trimestre">${i}º Trimestre</option>`; if(viewPeriodSel) viewPeriodSel.innerHTML += `<option value="${i}º Trimestre">${i}º Trimestre</option>`; }); 
        else if (currentSchoolGradingSystem === 'Semestral') [1,2].forEach(i => { periodSel.innerHTML += `<option value="${i}º Semestre">${i}º Semestre</option>`; if(viewPeriodSel) viewPeriodSel.innerHTML += `<option value="${i}º Semestre">${i}º Semestre</option>`; }); 
    } 

    if(isParent) { 
        document.getElementById('gradesFilterContainer').classList.add('hidden'); let childIds = String(currentUser.child_id).split(',').map(s=>s.trim()); let stds = await getFilteredData('students', 'name'); let myChildren = stds.filter(s => childIds.includes(String(s.id))); myChildren.forEach(s => { document.getElementById('gradesStudentList').innerHTML += `<li onclick="selectStudentForGrades('${s.id}', '${s.name}', '${s.class_name}')" class="student-grade-item p-4 cursor-pointer hover:bg-blue-50 transition border-b flex justify-between items-center text-gray-700 font-bold" id="stdItem-${s.id}"><span><i class="ph ph-user text-gray-400 mr-2"></i>${s.name}</span> <i class="ph ph-caret-right text-gray-300"></i></li>`; }); 
    } else { 
        document.getElementById('gradesFilterContainer').classList.remove('hidden'); let cls = await getFilteredData('classes', 'name'); if((currentUser.role === 'teacher' || currentUser.role === 'coordinator') && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); cls = cls.filter(c => myClasses.includes(c.name)); } let sel = document.getElementById('gradesClassSelect'); sel.innerHTML = '<option value="ALL">Todas as Suas Turmas</option>' + cls.map(c => `<option value="${c.name}">${c.name}</option>`).join(''); loadStudentsForGrades(); let subs = await getFilteredData('subjects', 'name'); document.getElementById('gradeSubjectSelect').innerHTML = '<option value="" disabled selected>Matéria...</option>' + subs.map(s => `<option value="${s.name}">${s.name}</option>`).join(''); 
    } 
}

async function loadStudentsForGrades() { const clsName = document.getElementById('gradesClassSelect').value; const list = document.getElementById('gradesStudentList'); list.innerHTML = '<div class="p-3 text-gray-400 text-xs text-center">Carregando...</div>'; let stds = await getFilteredData('students', 'name'); if((currentUser.role === 'teacher' || currentUser.role === 'coordinator') && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); stds = stds.filter(s => myClasses.includes(s.class_name)); } if(clsName !== 'ALL') stds = stds.filter(s => s.class_name === clsName); list.innerHTML = ''; if(stds.length === 0) list.innerHTML = '<div class="p-3 text-gray-400 text-xs text-center">Nenhum aluno.</div>'; stds.forEach(s => { list.innerHTML += `<li onclick="selectStudentForGrades('${s.id}', '${s.name}', '${s.class_name}')" class="student-grade-item p-3 cursor-pointer hover:bg-blue-50 transition border-b flex justify-between items-center text-gray-700 font-medium" id="stdItem-${s.id}"><span>${s.name}</span> <i class="ph ph-caret-right text-gray-300"></i></li>`; }); }

async function selectStudentForGrades(id, name, className) { 
    currentGradeStudentId = id; 
    currentGradeStudentName = name;
    currentGradeStudentClass = className;
    
    document.querySelectorAll('.student-grade-item').forEach(el => el.classList.remove('bg-blue-100', 'text-blue-700', 'border-l-4', 'border-blue-600')); 
    const item = document.getElementById(`stdItem-${id}`); if(item) item.classList.add('bg-blue-100', 'text-blue-700', 'border-l-4', 'border-blue-600'); 
    
    document.getElementById('noStudentSelectedMsg').classList.add('hidden'); 
    document.getElementById('gradesTableContainer').classList.remove('hidden'); 
    document.getElementById('selectedStudentClassLbl').innerText = className; 
    document.getElementById('selectedStudentClassLbl').classList.remove('hidden'); 
    
    // Revelar menu do PDF e Filtro de Períodos
    const pdfMenu = document.getElementById('gradesPeriodFilterContainer');
    if(pdfMenu) pdfMenu.classList.remove('hidden');

    if(currentUser.role !== 'parent') { document.getElementById('gradeFormContainer').classList.remove('hidden'); document.getElementById('lblSelectedStudentName').innerText = name; } 
    
    // Calcula as Faltas Globais do aluno selecionado
    let att = await getFilteredData('attendance');
    currentStudentFaltas = att.filter(a => a.student_id === id && a.status === 'Falta').length;

    // Carrega as Notas
    let grades = await getFilteredData('grades'); 
    currentStudentGrades = grades.filter(g => g.student_id === id).reverse(); 
    
    renderGradesTable();
}

function filterGradesByPeriod() { renderGradesTable(); }

function renderGradesTable() {
    const tbody = document.getElementById('gradesTable'); 
    const periodFilter = document.getElementById('viewGradePeriodSelect').value;
    
    let grades = currentStudentGrades;
    if(periodFilter !== 'ALL') grades = grades.filter(g => g.period === periodFilter);

    tbody.innerHTML = ''; 
    if(grades.length === 0) { tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-400">Nenhuma nota lançada para este período.</td></tr>'; return; } 
    
    grades.forEach(g => { 
        let c = g.value >= 7 ? 'text-green-600' : 'text-red-600'; 
        const btnDelete = (currentUser.role === 'director' || currentUser.role === 'coordinator' || currentUser.role === 'teacher') ? `<button onclick="openDeleteModal('${g.id}', 'grade')" class="ml-2 text-red-400 hover:text-red-600"><i class="ph ph-trash"></i></button>` : ''; 
        const displayPeriod = g.period || g.date; 
        // Adicionada a coluna de Faltas dinamicamente
        tbody.innerHTML += `<tr><td class="py-2">${g.subject}</td><td class="py-2 text-gray-500 font-medium">${displayPeriod}</td><td class="py-2 text-center text-gray-500 font-bold">${currentStudentFaltas}</td><td class="py-2 text-right font-black ${c}">${g.value.toFixed(1)} ${btnDelete}</td></tr>`; 
    }); 
}

async function addGrade(e) { e.preventDefault(); const subject = document.getElementById('gradeSubjectSelect').value; const period = document.getElementById('gradePeriodSelect').value; const value = parseFloat(document.getElementById('gradeInput').value); const date = new Date().toLocaleDateString('pt-BR'); if(!currentGradeStudentId) return; const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; await db.collection('grades').add({ student_id: currentGradeStudentId, subject, period, value, date, school_id: schId }); document.getElementById('gradeInput').value = ''; const sName = document.getElementById('lblSelectedStudentName').innerText; const sClass = document.getElementById('selectedStudentClassLbl').innerText; selectStudentForGrades(currentGradeStudentId, sName, sClass); }

// GERAÇÃO DE BOLETIM PDF COM JSPDF E AUTOTABLE
function generateBoletimPDF() {
    if(!currentGradeStudentId) return alert("Selecione um aluno primeiro.");
    if(typeof window.jspdf === 'undefined') return alert("Biblioteca PDF carregando, tente novamente em 1 segundo.");
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const period = document.getElementById('viewGradePeriodSelect').value;
    const periodLabel = period === 'ALL' ? 'Todos os Períodos' : period;
    const schoolLabel = document.getElementById('userSchoolDisplay').innerText;
    
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Tailwind blue-600
    doc.text("IsCoolar", 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text("Boletim Escolar Oficial", 14, 30);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Instituição: ${schoolLabel}`, 14, 40);
    doc.text(`Aluno: ${currentGradeStudentName}`, 14, 46);
    doc.text(`Turma: ${currentGradeStudentClass}`, 14, 52);
    doc.text(`Período Visualizado: ${periodLabel}`, 14, 58);
    
    let bodyData = [];
    let gradesToPrint = currentStudentGrades;
    if(period !== 'ALL') gradesToPrint = gradesToPrint.filter(g => g.period === period);
    
    gradesToPrint.forEach(g => {
        bodyData.push([g.subject, g.period || '-', g.value.toFixed(1), currentStudentFaltas]);
    });
    
    if(bodyData.length === 0) {
        bodyData.push([{content: 'Nenhuma nota registrada neste período.', colSpan: 4, styles: {halign: 'center', textColor: 150}}]);
    }

    doc.autoTable({
        startY: 65,
        head: [['Disciplina', 'Período de Avaliação', 'Nota Final', 'Faltas (Total)']],
        body: bodyData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 11 },
        bodyStyles: { fontSize: 10, textColor: 50 },
        columnStyles: {
            2: { halign: 'center', fontStyle: 'bold' },
            3: { halign: 'center' }
        }
    });
    
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    const dateStr = new Date().toLocaleDateString('pt-BR');
    doc.text(`Gerado via Plataforma IsCoolar em ${dateStr}.`, 14, doc.lastAutoTable.finalY + 10);

    doc.save(`Boletim_${currentGradeStudentName.replace(/\s+/g, '_')}.pdf`);
}

// FREQUÊNCIA E EVENTOS
async function loadAttendanceInit() { document.getElementById('attendanceDate').valueAsDate = new Date(); }
async function loadAttendanceClass() { const date=document.getElementById('attendanceDate').value; if(!date) return; const list=document.getElementById('attendanceListForm'); list.innerHTML=''; list.classList.remove('hidden'); let stds=await getFilteredData('students'); stds=stds.filter(s=>s.class_name===currentUser.class_name); stds.forEach(s => { list.innerHTML+=`<div class="flex justify-between items-center bg-white p-2 rounded border"><span class="font-medium text-gray-800">${s.name}</span><div class="flex gap-2"><button onclick="saveAttendance('${s.id}','${date}','Presente', this)" class="px-3 py-1 rounded bg-gray-200 hover:bg-green-500 hover:text-white transition text-xs font-bold">P</button><button onclick="saveAttendance('${s.id}','${date}','Falta', this)" class="px-3 py-1 rounded bg-gray-200 hover:bg-red-500 hover:text-white transition text-xs font-bold">F</button></div></div>`; }); }
async function saveAttendance(stId, date, status, btn) { const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; await db.collection('attendance').add({student_id:stId, date, status, school_id:schId}); btn.parentNode.innerHTML = `<span class="text-[10px] font-bold ${status==='Presente'?'text-green-600':'text-red-600'}">${status}</span>`; }
async function loadParentAttendance() { const list=document.getElementById('attendanceReportList'); list.innerHTML=''; let att=await getFilteredData('attendance'); att=att.filter(a=>a.student_id===currentUser.child_id); if(att.length===0) list.innerHTML='<li class="text-gray-400 py-4 text-center">Nenhum registro de falta.</li>'; else att.forEach(a=>{ list.innerHTML+=`<li class="p-3 border rounded-lg bg-gray-50 flex justify-between"><span>${a.date.split('-').reverse().join('/')}</span><span class="font-bold ${a.status==='Presente'?'text-green-600':'text-red-600'}">${a.status}</span></li>`; }); }
async function loadEvents() { const list=document.getElementById('eventsList')||document.getElementById('parentEventsList'); if(!list) return; list.innerHTML=''; let evs=await getFilteredData('events', 'event_date'); loadedEvents=evs; evs.forEach(e => { const d=e.event_date.split('-').reverse().join('/'); const canManage = (currentUser.role==='director'||currentUser.role==='coordinator'||currentUser.role==='admin'); const actions = canManage ? `<button onclick="startEditEvent('${e.id}')" title="Editar" class="text-blue-500 hover:bg-blue-50 p-1.5 rounded"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${e.id}', 'event')" title="Excluir" class="text-red-500 hover:bg-red-50 p-1.5 rounded"><i class="ph ph-trash text-lg"></i></button>` : ''; list.innerHTML+=`<div class="p-3 border rounded-xl bg-white shadow-sm flex justify-between items-center mb-2 fade-in"><div class="flex gap-4"><div class="bg-emerald-50 text-emerald-800 rounded-lg p-2 text-center w-14 shrink-0 font-bold text-xs">${d.substring(0,5)}<br><span class="text-[9px] font-normal text-gray-400">${e.event_time||''}</span></div><div class="flex-grow"><strong class="text-gray-800 block text-xs">${e.title}</strong><p class="text-[10px] text-gray-500 leading-tight">${e.description||''}</p></div></div><div class="flex gap-1">${actions}</div></div>`; }); }
async function handleEventSubmit(e) { e.preventDefault(); const t=document.getElementById('eventTitleInput').value.trim(); const d=document.getElementById('eventDateInput').value; const h=document.getElementById('eventTimeInput').value; const c=document.getElementById('eventDescInput').value.trim(); const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; try { if(editingEventId === null) { await db.collection('events').add({title:t, event_date:d, event_time:h, description:c, school_id:schId}); alert("Evento agendado com sucesso!"); } else { await db.collection('events').doc(editingEventId).update({title:t, event_date:d, event_time:h, description:c}); alert("Evento atualizado com sucesso!"); } cancelEventEdit(); loadEvents(); } catch (err) { alert("Erro ao salvar o evento."); } }
function startEditEvent(id) { const ev = loadedEvents.find(x => x.id === id); if(!ev) return; editingEventId = id; document.getElementById('eventTitleInput').value = ev.title; document.getElementById('eventDateInput').value = ev.event_date; document.getElementById('eventTimeInput').value = ev.event_time || ''; document.getElementById('eventDescInput').value = ev.description || ''; document.getElementById('eventFormTitle').innerHTML = `<i class="ph ph-pencil-simple"></i> Editar Evento`; document.getElementById('submitEventBtn').innerText = 'Atualizar Evento'; document.getElementById('btnCancelEvent').classList.remove('hidden'); document.getElementById('eventFormContainer').scrollIntoView({behavior: 'smooth', block: 'start'}); }
function cancelEventEdit() { editingEventId = null; document.getElementById('eventForm').reset(); document.getElementById('eventFormTitle').innerHTML = `<i class="ph ph-calendar-plus"></i> Agendar Evento`; document.getElementById('submitEventBtn').innerText = 'Salvar'; document.getElementById('btnCancelEvent').classList.add('hidden'); }

// ==========================================
// MURAL CHAT
// ==========================================
function handleFileSelection() { 
    const fileInput = document.getElementById('chatFileInput'); 
    if (fileInput && fileInput.files.length > 0) { 
        const file = fileInput.files[0];
        if (file.size > 1.5 * 1024 * 1024) { alert("O arquivo é muito grande. O limite máximo é de 1.5MB."); clearFileSelection(); return; }
        selectedFileName = file.name; 
        document.getElementById('fileNameDisplay').innerText = selectedFileName; 
        document.getElementById('clearFileBtn').classList.remove('hidden'); 
        const reader = new FileReader(); reader.onload = function(e) { selectedFileBase64 = e.target.result; }; reader.readAsDataURL(file);
    } 
}

function clearFileSelection() { 
    selectedFileName = null; selectedFileBase64 = null; 
    if(document.getElementById('chatFileInput')) document.getElementById('chatFileInput').value = ''; 
    document.getElementById('fileNameDisplay').innerText = 'Anexar Documento'; 
    document.getElementById('clearFileBtn').classList.add('hidden'); 
}

async function sendMessage(e) { 
    e.preventDefault(); 
    try {
        const input = document.getElementById('chatMessageInput'); 
        if(!input) return; 
        const text = input.value.trim(); 
        if (!text && !selectedFileName) return; 
        
        const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; 
        const btn = e.target.querySelector('button[type="submit"]'); const origHTML = btn.innerHTML; btn.innerHTML = '<span class="loader border-t-white w-4 h-4"></span>';
        
        const p = { sender_name: currentUser.name, sender_role: currentUser.role, message_text: text, file_name: selectedFileName || null, file_data: selectedFileBase64 || null, timestamp: Date.now(), school_id: schId, is_edited: false, is_deleted: false }; 
        input.value = ''; clearFileSelection();
        await db.collection('messages').add(p); 
        await loadChat(); 
    } catch(err) { console.error(err); alert("Erro ao enviar mensagem."); }
}

function downloadRealAttachment(msgId, fileName) {
    const base64Data = window.chatAttachments[msgId];
    if(!base64Data) { alert("O arquivo não está disponível ou foi corrompido."); return; }
    const a = document.createElement('a'); a.href = base64Data; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

async function editChatMessage(id) {
    const msg = loadedMessages.find(x => x.id === id); if(!msg) return;
    const newText = prompt("Edite sua mensagem:", msg.message_text);
    if(newText !== null && newText.trim() !== "" && newText !== msg.message_text) {
        try { await db.collection('messages').doc(id).update({ message_text: newText.trim(), is_edited: true }); loadChat(); } 
        catch(e) { alert("Erro ao editar a mensagem."); }
    }
}

async function deleteChatMessage(id) {
    if(confirm("Deseja realmente apagar esta mensagem para todos?")) {
        try { await db.collection('messages').doc(id).update({ message_text: "🚫 Mensagem apagada pelo autor.", file_name: null, file_data: null, is_deleted: true }); loadChat(); } 
        catch(e) { alert("Erro ao apagar a mensagem."); }
    }
}

async function loadChat() { 
    const box = document.getElementById('chatMessagesBox'); if(!box) return; box.innerHTML = ''; 
    window.chatAttachments = {}; 
    let msgs = await getFilteredData('messages', 'timestamp'); 
    loadedMessages = msgs; 
    
    msgs.forEach(m => { 
        const isMe = m.sender_name === currentUser.name; 
        const bubbleClass = isMe ? 'ml-auto bg-purple-600 text-white' : 'mr-auto bg-white text-gray-800 border shadow-sm'; 
        const labelRole = roleLabels[m.sender_role] || 'Usuário'; 
        
        let attachmentHtml = '';
        if(m.file_name && !m.is_deleted) {
            if(m.file_data) window.chatAttachments[m.id] = m.file_data;
            attachmentHtml = `<div onclick="downloadRealAttachment('${m.id}', '${m.file_name}')" class="mt-2 p-2 rounded-xl bg-black/10 hover:bg-black/20 transition text-[11px] cursor-pointer flex items-center gap-1.5 font-medium border border-black/5" title="Baixar anexo"><i class="ph ph-paperclip text-sm shrink-0"></i><span class="truncate flex-grow text-left">${m.file_name}</span><i class="ph ph-download text-xs shrink-0 opacity-70"></i></div>`; 
        }
        
        const editedLabel = m.is_edited && !m.is_deleted ? '<span class="text-[9px] italic opacity-60 ml-2">(editada)</span>' : '';
        const displayText = m.is_deleted ? `<i class="ph ph-prohibit align-middle"></i> Mensagem apagada pelo autor.` : (m.message_text || '');
        const textClass = m.is_deleted ? 'italic opacity-70' : '';

        const actions = (isMe && !m.is_deleted) ? `
            <div class="flex justify-end gap-2 mt-1 border-t border-black/10 pt-1">
                <button onclick="editChatMessage('${m.id}')" title="Editar" class="opacity-60 hover:opacity-100 transition"><i class="ph ph-pencil-simple text-sm"></i></button>
                <button onclick="deleteChatMessage('${m.id}')" title="Apagar" class="opacity-60 hover:opacity-100 transition"><i class="ph ph-trash text-sm"></i></button>
            </div>
        ` : '';

        box.innerHTML += `<div class="max-w-[85%] p-3 rounded-2xl text-xs ${bubbleClass} mb-2 fade-in">
            <span class="text-[10px] font-bold block mb-1 uppercase tracking-wide opacity-70 flex justify-between items-center">
                <span>${m.sender_name} (${labelRole})</span>
            </span>
            <p class="leading-relaxed whitespace-pre-wrap ${textClass}">${displayText}${editedLabel}</p>
            ${attachmentHtml}
            ${actions}
        </div>`; 
    }); 
    box.scrollTop = box.scrollHeight; 
}

// ==========================================
// EXCLUSÃO GERAL DO SISTEMA
// ==========================================
function openDeleteModal(id, type) { deletingEventId = id; deleteType = type; document.getElementById('deleteModal').classList.remove('hidden'); }
function closeDeleteModal() { deletingEventId = null; deleteType = null; document.getElementById('deleteModal').classList.add('hidden'); }
async function executeDeleteEvent() {
    const col = deleteType==='user'?'users':(deleteType==='student'?'students':(deleteType==='class'?'classes':(deleteType==='subject'?'subjects':(deleteType==='school'?'schools':(deleteType==='grade'?'grades':(deleteType==='global_subject'?'global_subjects':'events'))))));
    if(deleteType==='user') { await db.collection('users').doc(deletingEventId).delete(); } else await db.collection(col).doc(deletingEventId).delete();
    
    closeDeleteModal(); 
    if(deleteType==='event') loadEvents(); if(deleteType==='student') loadAdminStudents(); if(deleteType==='user') loadAdminStaff(); if(deleteType==='class') loadAdminClasses(); if(deleteType==='subject' || deleteType==='global_subject') loadAdminSubjects();
    if(deleteType==='school') { loadAdminSchools(); populateAdminSchoolsDropdown(); }
    if(deleteType==='grade') { const sName = document.getElementById('lblSelectedStudentName').innerText; const sClass = document.getElementById('selectedStudentClassLbl').innerText; selectStudentForGrades(currentGradeStudentId, sName, sClass); }
}