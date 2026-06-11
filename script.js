const firebaseConfig = {
    apiKey: "AIzaSyBR0U8ncxB5mDELgpo20KSNa746-GShtGY", authDomain: "iscoolar-4e3fb.firebaseapp.com",
    projectId: "iscoolar-4e3fb", storageBucket: "iscoolar-4e3fb.firebasestorage.app",
    messagingSenderId: "791237038299", appId: "1:791237038299:web:6050aca69b8706e234fcfe", measurementId: "G-LMM4KEC7RH"
};

let db = null, useMock = true, currentUser = null;
let loadedEvents = [], loadedStudents = [], loadedSchools = [], loadedStaff = [], loadedClasses = [], loadedGlobalSubjects = [], loadedMessages = [], loadedNotes = [], loadedCanteen = [];
let editingEventId = null, deletingEventId = null, editingStudentId = null, editingSchoolId = null, editingStaffId = null, editingClassId = null, editingGlobalSubjectId = null, editingNoteId = null, editingCanteenId = null;
let selectedFileName = null, selectedFileBase64 = null, deleteType = null;
let currentSchoolGradingSystem = "Bimestral", currentAdminSchoolId = null, currentGradeStudentId = null, tempAvatarBase64 = null;
let currentGradeStudentName = "", currentGradeStudentClass = "", currentStudentGrades = [], currentStudentFaltas = 0;
let activeChatId = null, activeChatType = null, activeChatName = "", activeChatAvatar = "";
let myChartInstance = null, currentRenderId = null, cropper = null; window.chatAttachments = {}; window.editingGradeId = null; window.loadedSchoolSubjects = [];

window.onload = async function() {
    try {
        if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); db = firebase.firestore(); }
        useMock = false;
        document.getElementById('dbStatus').className = "mt-8 p-3 bg-green-50 border-green-200 rounded-xl border text-xs text-green-700 text-center flex items-center justify-center gap-2 font-bold shadow-sm"; 
        document.getElementById('dbStatus').innerHTML = '<i class="ph ph-check-circle text-lg"></i> Conectado ao Servidor';
        
        const ntSel = document.getElementById('noteType'); const ntArea = document.getElementById('noteContent');
        if (ntSel && ntArea) {
            ntSel.addEventListener('change', function() { if (this.value === 'list' && ntArea.value.trim() === '') ntArea.value = '• '; });
            ntArea.addEventListener('keydown', function(e) { 
                if (ntSel.value === 'list' && e.key === 'Enter') { 
                    e.preventDefault(); const s = this.selectionStart, end = this.selectionEnd; 
                    this.value = this.value.substring(0, s) + '\n• ' + this.value.substring(end); this.selectionStart = this.selectionEnd = s + 3; 
                } 
            });
        }
    } catch (e) { document.getElementById('dbStatus').innerHTML = 'Erro de Conexão'; }
};

const navConfig = {
    admin: [ { id: 'home', icon: 'house', label: 'Início', action: 'loadDashboard()' }, { id: 'management', icon: 'shield-star', label: 'Admin DB', action: "switchAdminTab('schools')" } ],
    director: [ { id: 'home', icon: 'house', label: 'Início', action: 'loadDashboard()' }, { id: 'management', icon: 'briefcase', label: 'Gestão', action: "switchAdminTab('students')" }, { id: 'grades', icon: 'file-text', label: 'Boletim', action: 'loadGrades()' }, { id: 'attendance', icon: 'list-checks', label: 'Chamada', action: 'loadAttendanceInit()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'notes', icon: 'note-pencil', label: 'Anotações', action: 'loadNotes()' }, { id: 'canteen', icon: 'fork-knife', label: 'Cantina', action: 'loadCanteen()' }, { id: 'messages', icon: 'chat-circle-text', label: 'Chat', action: 'renderChatContacts()' } ],
    coordinator: [ { id: 'home', icon: 'house', label: 'Início', action: 'loadDashboard()' }, { id: 'management', icon: 'briefcase', label: 'Gestão', action: "switchAdminTab('students')" }, { id: 'grades', icon: 'file-text', label: 'Boletim', action: 'loadGrades()' }, { id: 'attendance', icon: 'list-checks', label: 'Chamada', action: 'loadAttendanceInit()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'notes', icon: 'note-pencil', label: 'Anotações', action: 'loadNotes()' }, { id: 'canteen', icon: 'fork-knife', label: 'Cantina', action: 'loadCanteen()' }, { id: 'messages', icon: 'chat-circle-text', label: 'Chat', action: 'renderChatContacts()' } ],
    teacher: [ { id: 'home', icon: 'house', label: 'Início', action: 'loadDashboard()' }, { id: 'grades', icon: 'file-text', label: 'Boletim', action: 'loadGrades()' }, { id: 'attendance', icon: 'list-checks', label: 'Chamada', action: 'loadAttendanceInit()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'notes', icon: 'note-pencil', label: 'Anotações', action: 'loadNotes()' }, { id: 'canteen', icon: 'fork-knife', label: 'Cantina', action: 'loadCanteen()' }, { id: 'messages', icon: 'chat-circle-text', label: 'Chat', action: 'renderChatContacts()' } ],
    parent: [ { id: 'home', icon: 'house', label: 'Início', action: 'loadDashboard()' }, { id: 'grades', icon: 'student', label: 'Boletim', action: 'loadGrades()' }, { id: 'attendance', icon: 'list-checks', label: 'Faltas', action: 'loadAttendanceInit()' }, { id: 'events', icon: 'calendar', label: 'Eventos', action: 'loadEvents()' }, { id: 'notes', icon: 'note-pencil', label: 'Anotações', action: 'loadNotes()' }, { id: 'canteen', icon: 'fork-knife', label: 'Cantina', action: 'loadCanteen()' }, { id: 'messages', icon: 'chat-circle-text', label: 'Chat', action: 'renderChatContacts()' } ]
};
const roleLabels = { admin: "Administrador", director: "Diretor(a)", coordinator: "Coordenador(a)", teacher: "Professor(a)", parent: "Responsável" };
const statusLabels = { "Online": "🟢 Online", "Ausente": "... Ausente", "De Férias": "🌴 De Férias", "Em Reunião": "📅 Em Reunião" };

function getInitials(name, type='USER') { if(!name) return "U"; let cleanName = String(name).replace(/\(.*?\)/g, '').trim().toUpperCase(); if (type === 'GROUP') { if(cleanName.includes('INFANTIL')) { return 'I' + (cleanName.replace(/\D/g, '') || 'N'); } let n = cleanName.replace(/º|ª/g, '').replace(/\s+/g, ''); return n.length >= 2 ? n.substring(0, 2) : (n[0] || 'G'); } else { let parts = cleanName.split(/\s+/); return parts.length === 1 ? (parts[0].length >= 2 ? parts[0].substring(0, 2) : parts[0][0]) : parts[0][0] + parts[parts.length - 1][0]; } }
function generateAvatar(name, role) { const bgColors = { admin: 'ef4444', director: 'f97316', coordinator: '10b981', teacher: '3b82f6', parent: '6b7280' }; return `https://ui-avatars.com/api/?name=${getInitials(name, 'USER')}&background=${bgColors[role] || '6b7280'}&color=fff&rounded=true&font-size=0.4&bold=true`; }
function generateGroupAvatar(name) { return `https://ui-avatars.com/api/?name=${getInitials(name, 'GROUP')}&background=8b5cf6&color=fff&rounded=true&font-size=0.4&bold=true`; }

async function handleLogin(e) {
    e.preventDefault(); const btn = document.getElementById('btnLoginSubmit'); const orig = btn.innerHTML; btn.innerHTML = '<span class="loader border-t-white w-4 h-4"></span>';
    const email = document.getElementById('loginEmail').value.toLowerCase().trim(); const pass = document.getElementById('loginPassword').value;
    try {
        const q = await db.collection('users').where('email', '==', email).where('password', '==', pass).get(); if(q.empty) throw new Error("Credenciais inválidas"); 
        currentUser = { id: q.docs[0].id, ...q.docs[0].data() }; if(!currentUser.avatar_url) currentUser.avatar_url = generateAvatar(currentUser.name, currentUser.role);
        let schoolName = "Plataforma Master";
        if(currentUser.role !== 'admin' && currentUser.school_id) { const doc = await db.collection('schools').doc(currentUser.school_id).get(); if(doc.exists) { schoolName = doc.data().name; currentSchoolGradingSystem = doc.data().grading_system || "Bimestral"; } }
        document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('userInfo').classList.remove('hidden'); document.getElementById('userNameDisplay').innerText = currentUser.name; document.getElementById('userAvatarDisplay').src = currentUser.avatar_url; document.getElementById('desktopSidebar').className = "hidden md:flex flex-col w-64 bg-white shadow-2xl z-20 shrink-0"; document.getElementById('userRoleDisplay').innerText = roleLabels[currentUser.role]; document.getElementById('userSchoolDisplay').innerText = schoolName;
        buildNav(currentUser.role); switchTab(navConfig[currentUser.role][0].id); eval(navConfig[currentUser.role][0].action);
        if(currentUser.role !== 'admin' && currentUser.role !== 'director') { document.getElementById('eventFormContainer')?.classList.add('hidden'); }
        if(currentUser.role === 'admin') { document.getElementById('adminTabBtn-schools').classList.remove('hidden'); document.getElementById('adminGlobalSchoolSelector').classList.remove('hidden'); document.getElementById('adminGlobalSchoolSelector').classList.add('flex'); populateAdminSchoolsDropdown(); }
    } catch(err) { alert("Falha no Login"); } finally { btn.innerHTML = orig; }
}

function buildNav(role) {
    const items = navConfig[role]; const desk = document.getElementById('desktopNavItems'); const mob = document.getElementById('mobileBottomNav'); desk.innerHTML = ''; mob.innerHTML = '';
    items.forEach(item => { desk.innerHTML += `<button id="deskNav-${item.id}" onclick="switchTab('${item.id}'); ${item.action}" class="w-full flex items-center gap-3 p-3.5 rounded-xl text-gray-500 hover:bg-blue-50 hover:text-[rgb(8,33,223)] transition font-bold text-sm group"><i class="ph ph-${item.icon} text-xl group-hover:scale-110 transition-transform"></i> ${item.label}</button>`; mob.innerHTML += `<button id="mobNav-${item.id}" onclick="switchTab('${item.id}'); ${item.action}" class="flex-1 flex flex-col items-center justify-center py-2 text-gray-400 hover:text-[rgb(8,33,223)] transition rounded-xl"><i class="ph ph-${item.icon} text-[22px] mb-1"></i><span class="text-[9px] font-black uppercase tracking-wider">${item.label}</span></button>`; });
    mob.classList.remove('hidden'); mob.classList.add('flex'); document.getElementById('appContainer').classList.remove('hidden');
}

function switchTab(viewId) {
    document.querySelectorAll('.view-panel').forEach(v => v.classList.add('hidden')); document.getElementById(`tab-${viewId}`).classList.remove('hidden');
    navConfig[currentUser.role].forEach(item => {
        let dBtn = document.getElementById(`deskNav-${item.id}`), mBtn = document.getElementById(`mobNav-${item.id}`);
        if(dBtn && mBtn) { 
            if(item.id === viewId) { dBtn.className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-blue-50/80 text-[rgb(8,33,223)] font-black text-sm transition relative overflow-hidden before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[rgb(8,33,223)] before:rounded-r-md shadow-sm"; mBtn.className="flex-1 flex flex-col items-center justify-center py-2 text-[rgb(8,33,223)] font-black transition relative before:absolute before:-top-1 before:left-1/2 before:-translate-x-1/2 before:w-12 before:h-1 before:bg-[rgb(8,33,223)] before:rounded-b-md bg-blue-50/40 rounded-xl"; document.getElementById('headerPageTitle').innerText=item.label; } 
            else { dBtn.className="w-full flex items-center gap-3 p-3.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-[rgb(8,33,223)] transition font-bold text-sm group"; mBtn.className="flex-1 flex flex-col items-center justify-center py-2 text-gray-400 hover:text-[rgb(8,33,223)] transition rounded-xl"; } 
        }
    });
}

function logout() { location.reload(); }
async function getFilteredData(collectionName, orderByField = null) {
    let targetSchool = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id;
    try { let ref = db.collection(collectionName); if(collectionName !== 'schools' && collectionName !== 'global_subjects') { if(!targetSchool) return []; ref = ref.where('school_id', '==', targetSchool); }
        const snapshot = await ref.get(); let data = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        if(orderByField) { data.sort((a,b) => { const valA = a[orderByField], valB = b[orderByField]; return (typeof valA === 'number' && typeof valB === 'number') ? valA - valB : String(valA || '').localeCompare(String(valB || '')); }); }
        return data; } catch (err) { return []; }
}

async function populateAdminSchoolsDropdown() { const sel = document.getElementById('globalAdminSchoolSelect'); if(!sel) return; let s = await getFilteredData('schools', 'name'); const currentVal = sel.value; sel.innerHTML = '<option value="">Selecione a Escola...</option>' + s.map(x=>`<option value="${x.id}">${x.name}</option>`).join(''); if(currentVal) sel.value = currentVal; }
async function changeAdminSchoolContext() { currentAdminSchoolId = document.getElementById('globalAdminSchoolSelect').value; if(currentAdminSchoolId) { const doc = await db.collection('schools').doc(currentAdminSchoolId).get(); if(doc.exists) currentSchoolGradingSystem = doc.data().grading_system || "Bimestral"; } const activeTabBtn = document.querySelector('[id^="adminTabBtn-"].bg-white'); if(activeTabBtn) switchAdminTab(activeTabBtn.id.replace('adminTabBtn-', '')); }

function openProfileModal() { document.getElementById('profileModal').classList.remove('hidden'); document.getElementById('modalAvatarView').src = currentUser.avatar_url; document.getElementById('modalNameView').innerText = currentUser.name; document.getElementById('modalEmailView').innerText = currentUser.email; document.getElementById('editNameInput').value = currentUser.name; document.getElementById('editPassInput').value = currentUser.password; if(document.getElementById('editStatusInput')) document.getElementById('editStatusInput').value = currentUser.status || "Online"; if (currentUser.role !== 'admin') { document.getElementById('editNameInput').readOnly = true; document.getElementById('editNameInput').classList.add('bg-gray-200', 'text-gray-500', 'cursor-not-allowed', 'opacity-70'); } else { document.getElementById('editNameInput').readOnly = false; document.getElementById('editNameInput').classList.remove('bg-gray-200', 'text-gray-500', 'cursor-not-allowed', 'opacity-70'); } tempAvatarBase64 = null; document.getElementById('profileViewMode').classList.remove('hidden'); document.getElementById('profileEditMode').classList.add('hidden'); }
function closeProfileModal() { document.getElementById('profileModal').classList.add('hidden'); }
function toggleProfileEdit() { document.getElementById('profileViewMode').classList.toggle('hidden'); document.getElementById('profileEditMode').classList.toggle('hidden'); }
function handleImageUpload(event) { const file = event.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = function(e) { document.getElementById('cropImage').src = e.target.result; document.getElementById('cropModal').classList.remove('hidden'); if (cropper) { cropper.destroy(); } const imageElement = document.getElementById('cropImage'); cropper = new Cropper(imageElement, { aspectRatio: 1, viewMode: 1, dragMode: 'move', autoCropArea: 1, restore: false, guides: true, center: true, highlight: false, cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false }); }; reader.readAsDataURL(file); } event.target.value = ''; }
function closeCropModal() { document.getElementById('cropModal').classList.add('hidden'); if(cropper) { cropper.destroy(); cropper = null; } }
function applyCrop() { if (!cropper) return; const canvas = cropper.getCroppedCanvas({ width: 256, height: 256, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' }); tempAvatarBase64 = canvas.toDataURL('image/jpeg', 0.8); document.getElementById('modalAvatarView').src = tempAvatarBase64; closeCropModal(); }
async function saveProfileEdits(e) { e.preventDefault(); const p = document.getElementById('editPassInput').value, n = document.getElementById('editNameInput').value, status = document.getElementById('editStatusInput').value, btn = document.getElementById('btnSaveProfile'); btn.innerText = "Salvando..."; let updates = { password: p, status: status }; if(currentUser.role === 'admin') updates.name = n; if(tempAvatarBase64) updates.avatar_url = tempAvatarBase64; try { await db.collection('users').doc(currentUser.id).update(updates); currentUser.password = p; currentUser.status = status; if(currentUser.role === 'admin') currentUser.name = n; if(tempAvatarBase64) { currentUser.avatar_url = tempAvatarBase64; document.getElementById('userAvatarDisplay').src = tempAvatarBase64; } document.getElementById('userNameDisplay').innerText = currentUser.name; alert("Perfil atualizado!"); toggleProfileEdit(); openProfileModal(); if(activeChatId) loadChat(); } catch(err) { alert("Erro"); } finally { btn.innerText = "Salvar"; } }

async function loadDashboard() { 
    let e = await getFilteredData('events'); 
    document.getElementById('statEvents').innerText = e.length; 
    
    // Se o usuário for um Pai/Responsável, o painel foca nos filhos
    if (currentUser.role === 'parent') {
        let childIds = String(currentUser.child_id).split(',').map(s=>s.trim()); 
        let s = await getFilteredData('students'); 
        let myChildren = s.filter(st => childIds.includes(String(st.id))); 
        
        document.getElementById('statStudents').innerText = myChildren.length; 
        document.getElementById('lblStatStudents').innerText = "Dependentes Cadastrados"; 
        
        // Esconde o card de funcionários e ajusta o layout para 2 colunas
        document.getElementById('cardStaff').classList.add('hidden');
        document.getElementById('dashboardGrid').className = "grid grid-cols-2 gap-4";
        document.getElementById('cardEvents').classList.remove('col-span-2', 'md:col-span-1');
    } 
    // Se for da equipe escolar (Diretor, Admin, Coordenação ou Professor), mostra a visão geral
    else {
        let s = await getFilteredData('students'); 
        let u = await getFilteredData('users'); 
        
        document.getElementById('statStudents').innerText = s.length; 
        document.getElementById('lblStatStudents').innerText = "Alunos Ativos"; 
        document.getElementById('statTeachers').innerText = u.filter(x=>x.role==='teacher'||x.role==='coordinator').length; 
        
        // Restaura o layout padrão de 3 colunas
        document.getElementById('cardStaff').classList.remove('hidden');
        document.getElementById('dashboardGrid').className = "grid grid-cols-2 md:grid-cols-3 gap-4";
        document.getElementById('cardEvents').classList.add('col-span-2', 'md:col-span-1');
    }
}

function switchAdminTab(tab) { ['schools', 'students', 'staff', 'classes', 'subjects', 'system'].forEach(t => { const v=document.getElementById(`adminView-${t}`), b=document.getElementById(`adminTabBtn-${t}`); if(v) { v.classList.add('hidden'); Array.from(v.children).forEach(child => { if(child.id !== 'adminSchoolWarning') child.style.display = ''; }); const warning = v.querySelector('#adminSchoolWarning'); if(warning) warning.remove(); } if(b) b.classList.remove('bg-white','shadow-sm','text-[rgb(8,33,223)]'); }); const activeView = document.getElementById(`adminView-${tab}`); if(activeView) activeView.classList.remove('hidden'); if(document.getElementById(`adminTabBtn-${tab}`)) document.getElementById(`adminTabBtn-${tab}`).classList.add('bg-white','shadow-sm','text-[rgb(8,33,223)]'); if(currentUser.role === 'coordinator') { ['adminTabBtn-classes', 'adminTabBtn-subjects', 'adminTabBtn-system'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).classList.add('hidden'); }); } if(currentUser.role === 'admin' && !currentAdminSchoolId && tab !== 'schools' && tab !== 'system') { if(activeView) { Array.from(activeView.children).forEach(child => child.style.display = 'none'); const warningMsg = document.createElement('div'); warningMsg.id = 'adminSchoolWarning'; warningMsg.className = 'p-6 text-center text-[rgb(8,33,223)] font-bold bg-blue-50 rounded-xl border border-blue-200 mt-2 shadow-sm'; warningMsg.innerHTML = '<i class="ph ph-info text-xl align-middle mr-1"></i> Selecione uma escola.'; activeView.appendChild(warningMsg); } return; } if(tab==='system') document.getElementById('globalGradingSystem').value = currentSchoolGradingSystem; if(tab==='schools') loadAdminSchools(); if(tab==='students') loadAdminStudents(); if(tab==='staff') loadAdminStaff(); if(tab==='classes') loadAdminClasses(); if(tab==='subjects') loadAdminSubjects(); }
async function populateSelects() { let c = await getFilteredData('classes', 'name'); if((currentUser.role === 'coordinator' || currentUser.role === 'teacher') && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); c = c.filter(cls => myClasses.includes(cls.name)); } const opt = '<option value="" disabled selected>Turma...</option>' + c.map(x=>`<option value="${x.name}">${x.name}</option>`).join(''); ['newStudentClass'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = opt; }); const roleSelect = document.getElementById('newStaffRole'); if(roleSelect) { if(currentUser.role === 'coordinator') { roleSelect.innerHTML = '<option value="teacher">Professor</option>'; } else { roleSelect.innerHTML = '<option value="coordinator">Coordenador</option><option value="teacher">Professor</option>'; } } const staffClassContainer = document.getElementById('newStaffClassContainer'); if(staffClassContainer) { let allC = await getFilteredData('classes', 'name'); staffClassContainer.innerHTML = allC.map(x => `<label class="flex items-center gap-2 cursor-pointer text-xs"><input type="checkbox" class="staff-class-checkbox w-3.5 h-3.5 text-emerald-600 rounded" value="${x.name}"> ${x.name}</label>`).join(''); } }
async function loadAdminSchools() { const list=document.getElementById('settingsSchoolsList'); list.innerHTML=''; let s=await getFilteredData('schools', 'name'); loadedSchools=s; if(editingSchoolId === null) document.getElementById('newSchoolId').value = 'escola_' + (s.length + 1); s.forEach(x => { list.innerHTML+=`<li class="p-4 flex justify-between items-center hover:bg-gray-50 transition"><div class="flex flex-col"><strong class="text-gray-800 text-sm font-black">${x.name}</strong><span class="text-[10px] text-gray-500 uppercase tracking-wide font-medium mt-0.5">ID: ${x.id}</span></div><div class="flex gap-2"><button onclick="startEditSchool('${x.id}')" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'school')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="ph ph-trash text-lg"></i></button></div></li>`; }); }
async function adminSaveSchool(e) { e.preventDefault(); const btn = document.getElementById('btnSaveSchool'); const originalText = btn.innerText; btn.innerText = 'Salvando...'; try { const id=document.getElementById('newSchoolId').value.trim(), name=document.getElementById('newSchoolName').value.trim(), phone=document.getElementById('newSchoolPhone').value, logradouro=document.getElementById('newSchoolLogradouro').value, numero=document.getElementById('newSchoolNumero').value, bairro=document.getElementById('newSchoolBairro').value, cidade=document.getElementById('newSchoolCidade').value, estado=document.getElementById('newSchoolEstado').value, cep=document.getElementById('newSchoolCEP').value, dName=document.getElementById('newDirName').value.trim(), dEmail=document.getElementById('newDirEmail').value.trim(), dPass=document.getElementById('newDirPass').value; const sData = {name, phone, logradouro, numero, bairro, city: cidade, estado, cep}; if (editingSchoolId === null) { sData.grading_system = 'Bimestral'; await db.collection('schools').doc(id).set(sData); await db.collection('users').add({email:dEmail, name:dName, role:'director', password:dPass, school_id:id}); } else { await db.collection('schools').doc(editingSchoolId).update(sData); const q = await db.collection('users').where('school_id','==',editingSchoolId).where('role','==','director').get(); if(!q.empty) await db.collection('users').doc(q.docs[0].id).update({name:dName, email:dEmail, password:dPass}); else await db.collection('users').add({email:dEmail, name:dName, role:'director', password:dPass, school_id:editingSchoolId}); } cancelSchoolEdit(); loadAdminSchools(); populateAdminSchoolsDropdown(); } catch (err) { alert("Falha: " + err.message); } finally { btn.innerText = originalText; } }
async function startEditSchool(id) { try { const sc = loadedSchools.find(x=>x.id===id); if(!sc) return; editingSchoolId = id; document.getElementById('newSchoolId').value = sc.id; document.getElementById('newSchoolId').readOnly = true; document.getElementById('newSchoolId').classList.add('bg-gray-100', 'opacity-70'); ['Name','Phone','Logradouro','Numero','Bairro','Cidade','Estado','CEP'].forEach(f => { if(document.getElementById(`newSchool${f}`)) document.getElementById(`newSchool${f}`).value = sc[f.toLowerCase()]||''; }); const q = await db.collection('users').where('school_id','==',id).where('role','==','director').get(); if(!q.empty) { let dir = q.docs[0].data(); document.getElementById('newDirName').value = dir.name; document.getElementById('newDirEmail').value = dir.email; document.getElementById('newDirPass').value = dir.password; } else { document.getElementById('newDirName').value = ''; document.getElementById('newDirEmail').value = ''; document.getElementById('newDirPass').value = '123'; } document.getElementById('btnSaveSchool').innerText = 'Atualizar'; document.getElementById('btnCancelSchool').classList.remove('hidden'); document.getElementById('adminView-schools').scrollIntoView({behavior: 'smooth', block: 'start'}); } catch (err) {} }
function cancelSchoolEdit() { editingSchoolId = null; document.getElementById('newSchoolId').readOnly = false; document.getElementById('newSchoolId').classList.remove('bg-gray-100', 'opacity-70'); ['Id','Name','Phone','Logradouro','Numero','Bairro','Cidade','Estado','CEP'].forEach(f => { if(document.getElementById(`newSchool${f}`)) document.getElementById(`newSchool${f}`).value=''; }); document.getElementById('newDirName').value=''; document.getElementById('newDirEmail').value=''; document.getElementById('newDirPass').value='123'; document.getElementById('btnSaveSchool').innerText = 'Cadastrar'; document.getElementById('btnCancelSchool').classList.add('hidden'); loadAdminSchools(); }

async function loadAdminStudents() { const list = document.getElementById('settingsStudentsList'); list.innerHTML = ''; let allStudents = await getFilteredData('students', 'name'); let allUsers = await getFilteredData('users'); if (editingStudentId === null) { let maxNum = 0; allStudents.forEach(st => { if(st.id && st.id.startsWith('ALUNO_')) { let num = parseInt(st.id.replace('ALUNO_', ''), 10); if(!isNaN(num) && num > maxNum) maxNum = num; } }); let nextId = 'ALUNO_' + String(maxNum + 1).padStart(3, '0'); const idInput = document.getElementById('newStudentId'); idInput.value = nextId; idInput.readOnly = true; idInput.classList.add('bg-gray-100', 'opacity-70', 'cursor-not-allowed'); } let s = allStudents; if (currentUser.role === 'coordinator' && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); s = s.filter(student => myClasses.includes(student.class_name)); } loadedStudents = s; const canEdit = currentUser.role === 'admin' || currentUser.role === 'director' || currentUser.role === 'coordinator'; s.forEach(x => { const actions = canEdit ? `<button onclick="startEditStudent('${x.id}')" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'student')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="ph ph-trash text-lg"></i></button>` : ''; let parents = allUsers.filter(u => u.role === 'parent' && u.child_id === x.id); let parentsText = parents.length > 0 ? parents.map(p => p.name.replace(/\(.*?\)/g, '').trim()).join(' | ') : 'Sem responsáveis'; list.innerHTML+=`<li class="p-4 flex justify-between items-center hover:bg-gray-50 transition"><div class="flex flex-col"><strong class="text-gray-800 text-sm font-black">${x.name}</strong><span class="text-[10px] text-gray-500 uppercase tracking-wide font-bold mt-0.5">RA: ${x.id} • <span class="text-[rgb(8,33,223)]">${x.class_name}</span></span><span class="text-[10px] text-gray-400 mt-1 font-medium"><i class="ph ph-users align-middle"></i> Pais/Resp: ${parentsText}</span></div><div class="flex gap-1">${actions}</div></li>`; }); populateSelects(); }
async function directorSaveStudent(e) { e.preventDefault(); const sid = document.getElementById('newStudentId').value.trim(), name = document.getElementById('newStudentName').value, class_name = document.getElementById('newStudentClass').value, r1e = document.getElementById('newResp1Email').value.trim(), r1n = document.getElementById('newResp1Name').value, r1r = document.getElementById('newResp1Rel').value, r2e = document.getElementById('newResp2Email').value.trim(), r2n = document.getElementById('newResp2Name').value, r2r = document.getElementById('newResp2Rel').value; const schId = currentUser.role==='admin' ? currentAdminSchoolId : currentUser.school_id; if(editingStudentId === null) { await db.collection('students').doc(sid).set({name, class_name, school_id:schId}); await db.collection('users').add({email:r1e, name:`${r1n} (${r1r})`, role:'parent', child_id:sid, password:'123', school_id:schId, status: 'Online'}); if(r2e && r2n) { await db.collection('users').add({email:r2e, name:`${r2n} (${r2r || 'Responsável 2'})`, role:'parent', child_id:sid, password:'123', school_id:schId, status: 'Online'}); } } else { if(sid!==editingStudentId) { await db.collection('students').doc(editingStudentId).delete(); await db.collection('students').doc(sid).set({name, class_name, school_id:schId}); } else { await db.collection('students').doc(sid).update({name, class_name, school_id:schId}); } const parentQuery = await db.collection('users').where('role', '==', 'parent').where('child_id', '==', editingStudentId).get(); let parentDocs = parentQuery.docs; if (parentDocs[0]) { await db.collection('users').doc(parentDocs[0].id).update({email: r1e, name: `${r1n} (${r1r})`, child_id: sid}); } else { await db.collection('users').add({email:r1e, name:`${r1n} (${r1r})`, role:'parent', child_id:sid, password:'123', school_id:schId, status: 'Online'}); } if (r2e && r2n) { if (parentDocs[1]) { await db.collection('users').doc(parentDocs[1].id).update({email: r2e, name: `${r2n} (${r2r || 'Responsável 2'})`, child_id: sid}); } else { await db.collection('users').add({email:r2e, name:`${r2n} (${r2r || 'Responsável 2'})`, role:'parent', child_id:sid, password:'123', school_id:schId, status: 'Online'}); } } else if (parentDocs[1] && (!r2e || !r2n)) { await db.collection('users').doc(parentDocs[1].id).delete(); } } cancelStudentEdit(); loadAdminStudents(); }
async function startEditStudent(id) { const s = loadedStudents.find(x=>x.id===id); if(!s) return; editingStudentId=id; const idInput = document.getElementById('newStudentId'); idInput.value = s.id; idInput.readOnly = true; idInput.classList.add('bg-gray-100', 'opacity-70', 'cursor-not-allowed'); document.getElementById('newStudentName').value = s.name; document.getElementById('newStudentClass').value = s.class_name; const parentQuery = await db.collection('users').where('role', '==', 'parent').where('child_id', '==', id).get(); let parents = parentQuery.docs.map(doc => doc.data()); if (parents[0]) { document.getElementById('newResp1Email').value = parents[0].email || ''; let match = parents[0].name.match(/(.*?)\s*\((.*?)\)/); if(match) { document.getElementById('newResp1Name').value = match[1].trim(); document.getElementById('newResp1Rel').value = match[2].trim(); } else { document.getElementById('newResp1Name').value = parents[0].name.replace(/\(.*?\)/g, '').trim(); document.getElementById('newResp1Rel').value = ''; } } if (parents[1]) { document.getElementById('newResp2Email').value = parents[1].email || ''; let match = parents[1].name.match(/(.*?)\s*\((.*?)\)/); if(match) { document.getElementById('newResp2Name').value = match[1].trim(); document.getElementById('newResp2Rel').value = match[2].trim(); } else { document.getElementById('newResp2Name').value = parents[1].name.replace(/\(.*?\)/g, '').trim(); document.getElementById('newResp2Rel').value = ''; } } document.getElementById('btnSaveStudent').innerText = 'Atualizar'; document.getElementById('btnCancelStudent').classList.remove('hidden'); document.getElementById('adminView-students').scrollIntoView({behavior:'smooth'}); }
function cancelStudentEdit() { editingStudentId=null; ['newStudentName','newStudentClass','newResp1Email','newResp1Rel','newResp1Name','newResp2Email','newResp2Rel','newResp2Name'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ''; }); document.getElementById('btnSaveStudent').innerText='Matricular'; document.getElementById('btnCancelStudent').classList.add('hidden'); loadAdminStudents(); }
async function loadAdminStaff() { const list=document.getElementById('settingsStaffList'); list.innerHTML=''; let u=await getFilteredData('users', 'name'); loadedStaff=u; u.filter(x=>x.role!=='parent' && x.role!=='admin').forEach(x => { const canEdit = currentUser.role === 'admin' || currentUser.role === 'director' || (currentUser.role === 'coordinator' && x.role !== 'director' && x.role !== 'coordinator'); let actions = ''; if(canEdit) { actions = `<button onclick="resetUserPassword('${x.id}')" title="Resetar Senha" class="text-amber-500 hover:bg-amber-50 p-2 rounded-lg"><i class="ph ph-key text-lg"></i></button><button onclick="startEditStaff('${x.id}')" title="Editar Usuário" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'user')" title="Excluir Usuário" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="ph ph-trash text-lg"></i></button>`; } list.innerHTML+=`<li class="p-4 flex justify-between items-center hover:bg-gray-50 transition"><div class="flex flex-col"><strong class="text-gray-800 text-sm font-black">${x.name} <span class="bg-gray-100 text-gray-500 px-2 py-0.5 rounded ml-1 text-[9px] uppercase tracking-wider">${roleLabels[x.role]||x.role}</span></strong><span class="text-[10px] text-gray-500 font-medium mt-1">${x.email} • Turmas: <span class="font-bold text-gray-700">${x.class_name||'Geral'}</span></span></div><div class="flex gap-1">${actions}</div></li>`; }); populateSelects(); }
async function directorAddStaff(e) { e.preventDefault(); const role=document.getElementById('newStaffRole').value, name=document.getElementById('newStaffName').value, email=document.getElementById('newStaffEmail').value, checkboxes = document.querySelectorAll('.staff-class-checkbox:checked'), class_name = Array.from(checkboxes).map(cb => cb.value).join(', '), schId = currentUser.role==='admin' ? currentAdminSchoolId : currentUser.school_id; const p={email, name, role, class_name, password:'123', school_id:schId, status: 'Online'}; if(editingStaffId === null) { await db.collection('users').add(p); } else { await db.collection('users').doc(editingStaffId).update({role, name, email, class_name}); } cancelStaffEdit(); loadAdminStaff(); }
function startEditStaff(id) { const st = loadedStaff.find(x=>x.id===id); if(!st) return; editingStaffId = id; document.getElementById('newStaffRole').value = st.role; document.getElementById('newStaffName').value = st.name; document.getElementById('newStaffEmail').value = st.email; const assigned = (st.class_name || '').split(', '); document.querySelectorAll('.staff-class-checkbox').forEach(cb => { cb.checked = assigned.includes(cb.value); }); document.getElementById('btnSaveStaff').innerText = 'Atualizar'; document.getElementById('btnCancelStaff').classList.remove('hidden'); document.getElementById('adminView-staff').scrollIntoView({behavior:'smooth'}); }
function cancelStaffEdit() { editingStaffId=null; document.getElementById('newStaffRole').value='coordinator'; document.getElementById('newStaffName').value=''; document.getElementById('newStaffEmail').value=''; document.querySelectorAll('.staff-class-checkbox').forEach(cb => cb.checked = false); document.getElementById('btnSaveStaff').innerText='Contratar'; document.getElementById('btnCancelStaff').classList.add('hidden'); }
async function loadAdminClasses() { const list=document.getElementById('settingsClassesList'); list.innerHTML=''; let c=await getFilteredData('classes', 'name'); loadedClasses=c; c.forEach(x=>{list.innerHTML+=`<li class="p-4 flex justify-between items-center hover:bg-gray-50 transition"><span class="font-black text-gray-800">${x.name}</span><div class="flex gap-2"><button onclick="startEditClass('${x.id}')" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${x.id}', 'class')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="ph ph-trash text-lg"></i></button></div></li>`;}); }
async function directorAddClass(e) { e.preventDefault(); const s=document.getElementById('newClassSerie').value.toUpperCase().trim(), t=document.getElementById('newClassTurma').value.toUpperCase().trim(), n=`${s} ${t}`.trim(), schId = currentUser.role==='admin' ? currentAdminSchoolId : currentUser.school_id; if(editingClassId === null) { await db.collection('classes').add({serie:s, turma:t, name:n, school_id:schId}); } else { await db.collection('classes').doc(editingClassId).update({serie:s, turma:t, name:n}); } cancelClassEdit(); loadAdminClasses(); populateSelects(); }
function startEditClass(id) { const cl = loadedClasses.find(x=>x.id===id); if(!cl) return; editingClassId = id; document.getElementById('newClassSerie').value = cl.serie; document.getElementById('newClassTurma').value = cl.turma; document.getElementById('btnSaveClass').innerText = 'Atualizar'; document.getElementById('btnCancelClass').classList.remove('hidden'); document.getElementById('adminView-classes').scrollIntoView({behavior:'smooth'}); }
function cancelClassEdit() { editingClassId=null; document.getElementById('newClassSerie').value=''; document.getElementById('newClassTurma').value=''; document.getElementById('btnSaveClass').innerText='Criar Turma'; document.getElementById('btnCancelClass').classList.add('hidden'); }
async function loadAdminSubjects() { const adminBlock = document.getElementById('adminGlobalSubjectsBlock'), schoolBlock = document.getElementById('schoolSubjectsBlock'), globalList = document.getElementById('globalSubjectsList'), cbContainer = document.getElementById('subjectsCheckboxContainer'); let globalSubs = await getFilteredData('global_subjects', 'name'); loadedGlobalSubjects = globalSubs; if (currentUser.role === 'admin') { if(adminBlock) { adminBlock.classList.remove('hidden'); adminBlock.classList.add('flex'); } if(globalList) { globalList.innerHTML = ''; globalSubs.forEach(sb => { globalList.innerHTML += `<li class="p-4 flex justify-between items-center hover:bg-gray-50 transition"><span class="font-black text-gray-800 text-sm">${sb.name}</span><div class="flex gap-2"><button onclick="startEditGlobalSubject('${sb.id}')" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${sb.id}', 'global_subject')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg"><i class="ph ph-trash text-lg"></i></button></div></li>`; }); } } else { if(adminBlock) { adminBlock.classList.add('hidden'); adminBlock.classList.remove('flex'); } } const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; if (!schId) { if(schoolBlock) schoolBlock.classList.add('hidden'); return; } if(schoolBlock) schoolBlock.classList.remove('hidden'); if(cbContainer) { cbContainer.innerHTML = ''; let schoolSubjects = await getFilteredData('subjects'), schoolSubNames = schoolSubjects.map(s => s.name); globalSubs.forEach(sub => { const isChecked = schoolSubNames.includes(sub.name) ? 'checked' : ''; cbContainer.innerHTML += `<label class="flex items-center gap-2 p-3 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer hover:border-[rgb(8,33,223)] transition"><input type="checkbox" class="subject-checkbox w-4 h-4 text-[rgb(8,33,223)] rounded" value="${sub.name}" ${isChecked}><span class="text-xs font-bold text-gray-700">${sub.name}</span></label>`; }); } }
async function adminAddGlobalSubject(e) { e.preventDefault(); const name = document.getElementById('newGlobalSubjectName').value.trim(); if(name) { if(editingGlobalSubjectId === null) { await db.collection('global_subjects').add({name}); } else { await db.collection('global_subjects').doc(editingGlobalSubjectId).update({name}); } cancelGlobalSubjectEdit(); loadAdminSubjects(); } }
function startEditGlobalSubject(id) { const sb = loadedGlobalSubjects.find(x=>x.id===id); if(!sb) return; editingGlobalSubjectId = id; document.getElementById('newGlobalSubjectName').value = sb.name; document.getElementById('btnSaveGlobalSubject').innerText = 'Atualizar'; document.getElementById('btnCancelGlobalSubject').classList.remove('hidden'); }
function cancelGlobalSubjectEdit() { editingGlobalSubjectId = null; document.getElementById('newGlobalSubjectName').value = ''; document.getElementById('btnSaveGlobalSubject').innerText = 'Gravar'; document.getElementById('btnCancelGlobalSubject').classList.add('hidden'); }
async function directorSaveSubjects(e) { e.preventDefault(); const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id, checkboxes = document.querySelectorAll('.subject-checkbox'), selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value), old = await db.collection('subjects').where('school_id','==',schId).get(), batch = db.batch(); old.docs.forEach(doc => batch.delete(doc.ref)); selected.forEach(sub => { const newRef = db.collection('subjects').doc(); batch.set(newRef, { name: sub, school_id: schId }); }); await batch.commit(); loadAdminSubjects(); }
async function updateGradingSystem() { const val = document.getElementById('globalGradingSystem').value; currentSchoolGradingSystem = val; const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; if(!schId) return; await db.collection('schools').doc(schId).update({grading_system: val}); }

// ============================================
// BOLETIM PDF, GRÁFICOS E PLANILHA INTERATIVA
// ============================================

async function loadGrades() { 
    const isParent = currentUser.role === 'parent'; 
    document.getElementById('gradesTableContainer').classList.add('hidden'); 
    document.getElementById('chartContainer')?.classList.add('hidden'); 
    document.getElementById('noStudentSelectedMsg').classList.remove('hidden'); 
    document.getElementById('selectedStudentClassLbl').classList.add('hidden'); 
    document.getElementById('gradesStudentList').innerHTML = ''; 
    document.getElementById('lblSelectedStudentName').innerText = 'Selecione um aluno';
    document.getElementById('lblGradingSystem').innerText = "Boletim " + currentSchoolGradingSystem; 

    window.loadedSchoolSubjects = await getFilteredData('subjects', 'name');

    const viewPeriodSel = document.getElementById('viewGradePeriodSelect'); 
    if (viewPeriodSel) { 
        viewPeriodSel.innerHTML = ''; 
        let firstPeriod = '';
        if (currentSchoolGradingSystem === 'Bimestral') {
            [1,2,3,4].forEach(i => { let p = `${i}º Bimestre`; if(!firstPeriod) firstPeriod = p; viewPeriodSel.innerHTML += `<option value="${p}">${p}</option>`; }); 
        } else if (currentSchoolGradingSystem === 'Trimestral') {
            [1,2,3].forEach(i => { let p = `${i}º Trimestre`; if(!firstPeriod) firstPeriod = p; viewPeriodSel.innerHTML += `<option value="${p}">${p}</option>`; }); 
        } else if (currentSchoolGradingSystem === 'Semestral') {
            [1,2].forEach(i => { let p = `${i}º Semestre`; if(!firstPeriod) firstPeriod = p; viewPeriodSel.innerHTML += `<option value="${p}">${p}</option>`; }); 
        }
        viewPeriodSel.innerHTML += `<option value="ALL">Histórico e Gráfico</option>`;
        viewPeriodSel.value = firstPeriod; 
    } 

    if(isParent) { 
        document.getElementById('gradesFilterContainer').classList.add('hidden'); 
        let childIds = String(currentUser.child_id).split(',').map(s=>s.trim()); 
        let stds = await getFilteredData('students', 'name'); 
        let myChildren = stds.filter(s => childIds.includes(String(s.id))); 
        myChildren.forEach(s => { document.getElementById('gradesStudentList').innerHTML += `<li onclick="selectStudentForGrades('${s.id}', '${s.name}', '${s.class_name}')" class="student-grade-item p-4 cursor-pointer hover:bg-gray-100 transition border-b border-gray-100 flex justify-between items-center text-gray-700 font-bold" id="stdItem-${s.id}"><span><i class="ph ph-user text-gray-400 mr-2 text-lg align-middle"></i>${s.name}</span> <i class="ph ph-caret-right text-gray-300"></i></li>`; }); 
    } else { 
        document.getElementById('gradesFilterContainer').classList.remove('hidden'); 
        let cls = await getFilteredData('classes', 'name'); 
        if((currentUser.role === 'teacher' || currentUser.role === 'coordinator') && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); cls = cls.filter(c => myClasses.includes(c.name)); } 
        let sel = document.getElementById('gradesClassSelect'); sel.innerHTML = '<option value="ALL">Todas as Suas Turmas</option>' + cls.map(c => `<option value="${c.name}">${c.name}</option>`).join(''); 
        loadStudentsForGrades(); 
    } 
}

async function loadStudentsForGrades() { const clsName = document.getElementById('gradesClassSelect').value, list = document.getElementById('gradesStudentList'); list.innerHTML = '<div class="p-4 text-gray-400 text-xs text-center font-medium">Carregando alunos...</div>'; let stds = await getFilteredData('students', 'name'); if((currentUser.role === 'teacher' || currentUser.role === 'coordinator') && currentUser.class_name) { const myClasses = currentUser.class_name.split(', '); stds = stds.filter(s => myClasses.includes(s.class_name)); } if(clsName !== 'ALL') stds = stds.filter(s => s.class_name === clsName); list.innerHTML = ''; if(stds.length === 0) list.innerHTML = '<div class="p-4 text-gray-400 text-xs text-center font-medium">Nenhum aluno.</div>'; stds.forEach(s => { list.innerHTML += `<li onclick="selectStudentForGrades('${s.id}', '${s.name}', '${s.class_name}')" class="student-grade-item p-4 cursor-pointer hover:bg-gray-100 transition border-b border-gray-100 flex justify-between items-center text-gray-700 font-bold" id="stdItem-${s.id}"><span>${s.name}</span> <i class="ph ph-caret-right text-gray-300"></i></li>`; }); }

async function selectStudentForGrades(id, name, className) { 
    currentGradeStudentId = id; currentGradeStudentName = name; currentGradeStudentClass = className; window.editingGradeId = null;
    document.querySelectorAll('.student-grade-item').forEach(el => el.classList.remove('bg-blue-50', 'text-[rgb(8,33,223)]', 'border-l-4', 'border-[rgb(8,33,223)]')); 
    const item = document.getElementById(`stdItem-${id}`); if(item) item.classList.add('bg-blue-50', 'text-[rgb(8,33,223)]', 'border-l-4', 'border-[rgb(8,33,223)]'); 
    
    document.getElementById('noStudentSelectedMsg').classList.add('hidden'); 
    document.getElementById('gradesTableContainer').classList.remove('hidden'); 
    document.getElementById('selectedStudentClassLbl').innerText = className; 
    document.getElementById('selectedStudentClassLbl').classList.remove('hidden'); 
    document.getElementById('gradesPeriodFilterContainer').classList.remove('hidden'); 
    document.getElementById('lblSelectedStudentName').innerText = name; 
    
    let att = await getFilteredData('attendance'); currentStudentFaltas = att.filter(a => a.student_id === id && a.status === 'Falta').length; 
    let grades = await getFilteredData('grades'); currentStudentGrades = grades.filter(g => g.student_id === id).reverse(); 
    
    renderGradesTable(); 
}

function filterGradesByPeriod() { window.editingGradeId = null; renderGradesTable(); }

function renderGradesTable() { 
    const tbody = document.getElementById('gradesTable'); 
    const periodFilter = document.getElementById('viewGradePeriodSelect').value; 
    const chartDiv = document.getElementById('chartContainer');
    tbody.innerHTML = ''; 
    
    if (periodFilter === 'ALL') {
        if(chartDiv) chartDiv.classList.remove('hidden');
        if(currentStudentGrades.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400 font-medium">Nenhuma nota registrada no sistema.</td></tr>'; 
            if(myChartInstance) { myChartInstance.destroy(); myChartInstance = null; }
            if(chartDiv) chartDiv.classList.add('hidden');
            return; 
        } 
        currentStudentGrades.forEach(g => { 
            let c = g.value >= 7 ? 'text-green-600' : 'text-red-600'; 
            const btnDelete = (currentUser.role === 'director' || currentUser.role === 'coordinator' || currentUser.role === 'teacher') ? `<button onclick="openDeleteModal('${g.id}', 'grade')" class="ml-3 text-gray-400 hover:text-red-600 transition" title="Excluir"><i class="ph ph-trash text-base"></i></button>` : ''; 
            tbody.innerHTML += `<tr class="hover:bg-gray-50 transition"><td class="p-4 font-bold text-gray-800">${g.subject}</td><td class="p-4 text-gray-500 font-medium">${g.period}</td><td class="p-4 text-center text-gray-600 font-bold">${currentStudentFaltas}</td><td class="p-4 text-right font-black text-sm ${c}">${g.value.toFixed(1)} ${btnDelete}</td></tr>`; 
        }); 
        renderPerformanceChart();
    } else {
        if(myChartInstance) { myChartInstance.destroy(); myChartInstance = null; }
        if(chartDiv) chartDiv.classList.add('hidden');

        let subs = window.loadedSchoolSubjects || [];
        if(subs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400 font-medium">Nenhuma disciplina cadastrada na escola. Vá em Gestão > Matérias.</td></tr>';
            return;
        }

        subs.forEach(s => {
            let existingGrade = currentStudentGrades.find(g => g.subject === s.name && g.period === periodFilter);
            let safeId = s.name.replace(/[^a-zA-Z0-9]/g, ''); 

            if (existingGrade) {
                if (window.editingGradeId === existingGrade.id) {
                    tbody.innerHTML += `<tr class="bg-blue-50/50"><td class="p-4 font-bold text-gray-800">${s.name}</td><td class="p-4 text-gray-500 font-medium">${periodFilter}</td><td class="p-4 text-center text-gray-600 font-bold">${currentStudentFaltas}</td><td class="p-4 text-right flex justify-end items-center gap-2"><input type="number" id="edit_grade_${existingGrade.id}" value="${existingGrade.value}" step="0.1" min="0" max="10" class="w-20 p-2 border border-blue-300 rounded-lg text-center font-bold outline-none focus:border-blue-600 shadow-inner"> <button onclick="updateSpecificGrade('${existingGrade.id}', 'edit_grade_${existingGrade.id}')" class="bg-[rgb(8,33,223)] hover:bg-[#0618a6] text-white p-2 rounded-lg shadow-md transition" title="Salvar Alteração"><i class="ph ph-check-circle text-lg"></i></button><button onclick="cancelEditGrade()" class="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg transition" title="Cancelar"><i class="ph ph-x text-lg"></i></button></td></tr>`;
                } else {
                    let c = existingGrade.value >= 7 ? 'text-green-600' : 'text-red-600'; 
                    const canEdit = (currentUser.role === 'director' || currentUser.role === 'coordinator' || currentUser.role === 'teacher');
                    const actions = canEdit ? `<button onclick="startEditGrade('${existingGrade.id}')" class="ml-3 text-gray-400 hover:text-[rgb(8,33,223)] transition" title="Editar"><i class="ph ph-pencil-simple text-base"></i></button><button onclick="openDeleteModal('${existingGrade.id}', 'grade')" class="ml-2 text-gray-400 hover:text-red-600 transition" title="Excluir"><i class="ph ph-trash text-base"></i></button>` : '';
                    tbody.innerHTML += `<tr class="hover:bg-gray-50 transition"><td class="p-4 font-bold text-gray-800">${s.name}</td><td class="p-4 text-gray-500 font-medium">${periodFilter}</td><td class="p-4 text-center text-gray-600 font-bold">${currentStudentFaltas}</td><td class="p-4 text-right font-black text-sm ${c}">${existingGrade.value.toFixed(1)} ${actions}</td></tr>`;
                }
            } else {
                if (currentUser.role === 'parent') {
                    tbody.innerHTML += `<tr class="hover:bg-gray-50 transition"><td class="p-4 font-bold text-gray-800">${s.name}</td><td class="p-4 text-gray-500 font-medium">${periodFilter}</td><td class="p-4 text-center text-gray-600 font-bold">${currentStudentFaltas}</td><td class="p-4 text-right text-gray-400 italic font-medium text-sm">Sem nota</td></tr>`;
                } else {
                    tbody.innerHTML += `<tr class="hover:bg-gray-50 transition group"><td class="p-4 font-bold text-gray-800">${s.name}</td><td class="p-4 text-gray-500 font-medium">${periodFilter}</td><td class="p-4 text-center text-gray-600 font-bold">${currentStudentFaltas}</td><td class="p-4 text-right flex justify-end items-center gap-2"><input type="number" id="input_grade_${safeId}" placeholder="Nota" step="0.1" min="0" max="10" class="w-20 p-2 border border-gray-200 rounded-lg text-center font-bold outline-none focus:border-[rgb(8,33,223)] transition"> <button onclick="saveSpecificGrade('${s.name}', '${periodFilter}', 'input_grade_${safeId}')" class="bg-[rgb(8,33,223)] hover:bg-[#0618a6] text-white px-4 py-2 rounded-lg font-bold transition shadow-sm text-xs">Salvar</button></td></tr>`;
                }
            }
        });
    }
}

function startEditGrade(id) { window.editingGradeId = id; renderGradesTable(); }
function cancelEditGrade() { window.editingGradeId = null; renderGradesTable(); }

async function saveSpecificGrade(subject, period, inputId) {
    const valInput = document.getElementById(inputId); const value = parseFloat(valInput.value);
    if(isNaN(value) || value < 0 || value > 10) return alert("Insira uma nota válida de 0 a 10.");
    valInput.disabled = true; const date = new Date().toLocaleDateString('pt-BR'); const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; 
    try {
        await db.collection('grades').add({ student_id: currentGradeStudentId, subject, period, value, date, school_id: schId }); 
        const sName = document.getElementById('lblSelectedStudentName').innerText, sClass = document.getElementById('selectedStudentClassLbl').innerText; 
        selectStudentForGrades(currentGradeStudentId, sName, sClass); 
    } catch(e) { alert("Erro."); valInput.disabled = false; }
}

async function updateSpecificGrade(id, inputId) {
    const valInput = document.getElementById(inputId); const value = parseFloat(valInput.value);
    if(isNaN(value) || value < 0 || value > 10) return alert("Insira uma nota válida de 0 a 10.");
    valInput.disabled = true;
    try {
        await db.collection('grades').doc(id).update({ value }); window.editingGradeId = null;
        const sName = document.getElementById('lblSelectedStudentName').innerText, sClass = document.getElementById('selectedStudentClassLbl').innerText; 
        selectStudentForGrades(currentGradeStudentId, sName, sClass); 
    } catch(e) { alert("Erro."); valInput.disabled = false; }
}

function renderPerformanceChart() {
    const ctx = document.getElementById('performanceChart'); if(!ctx) return;
    let periodsSet = new Set(), subjectsSet = new Set();
    currentStudentGrades.forEach(g => { if(g.period) periodsSet.add(g.period); if(g.subject) subjectsSet.add(g.subject); });
    let labels = Array.from(periodsSet).sort((a, b) => a.localeCompare(b, undefined, {numeric: true})), subjects = Array.from(subjectsSet);
    let datasets = subjects.map((sub, idx) => {
        let data = labels.map(p => { let match = currentStudentGrades.find(g => g.subject === sub && g.period === p); return match ? match.value : null; });
        const colors = ['rgb(8,33,223)', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']; const color = colors[idx % colors.length];
        return { label: sub, data: data, borderColor: color, backgroundColor: color + '15', tension: 0.3, borderWidth: 3, pointRadius: 4, spanGaps: true };
    });
    if(myChartInstance) { myChartInstance.destroy(); }
    myChartInstance = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 10, ticks: { font: { weight: 'bold' } }, grid: { color: '#f3f4f6' } }, x: { ticks: { font: { weight: 'bold' } }, grid: { display: false } } }, plugins: { legend: { position: 'top', labels: { font: { weight: 'bold', size: 11 }, boxWidth: 12 } } } } });
}

function generateBoletimPDF() { if(!currentGradeStudentId) return; const { jsPDF } = window.jspdf; const doc = new jsPDF(); const period = document.getElementById('viewGradePeriodSelect').value, periodLabel = period === 'ALL' ? 'Todos os Períodos' : period, schoolLabel = document.getElementById('userSchoolDisplay').innerText; doc.setFontSize(22); doc.setTextColor(8, 33, 223); doc.text("IsCoolar", 14, 20); doc.setFontSize(14); doc.setTextColor(50, 50, 50); doc.text("Boletim Escolar", 14, 30); doc.setFontSize(11); doc.setTextColor(100, 100, 100); doc.text(`Escola: ${schoolLabel}`, 14, 40); doc.text(`Aluno: ${currentGradeStudentName}`, 14, 46); doc.text(`Turma: ${currentGradeStudentClass}`, 14, 52); doc.text(`Período: ${periodLabel}`, 14, 58); let bodyData = []; let gradesToPrint = currentStudentGrades; if(period !== 'ALL') gradesToPrint = gradesToPrint.filter(g => g.period === period); gradesToPrint.forEach(g => { bodyData.push([g.subject, g.period || '-', g.value.toFixed(1), currentStudentFaltas]); }); if(bodyData.length === 0) bodyData.push([{content: 'Nenhuma nota', colSpan: 4, styles: {halign: 'center'}}]); doc.autoTable({ startY: 65, head: [['Disciplina', 'Período', 'Nota', 'Faltas']], body: bodyData, theme: 'grid', headStyles: { fillColor: [8, 33, 223] } }); doc.save(`Boletim_${currentGradeStudentName}.pdf`); }

// ==========================================
// CHAMADA E RELATÓRIO DE FALTAS 
// ==========================================
function switchAttendanceTab(tab) {
    document.getElementById('attendanceView-call').classList.add('hidden');
    document.getElementById('attendanceView-report').classList.add('hidden');
    document.getElementById('attTabBtn-call').classList.remove('bg-white', 'shadow-sm', 'text-indigo-600');
    document.getElementById('attTabBtn-report').classList.remove('bg-white', 'shadow-sm', 'text-indigo-600');
    
    document.getElementById(`attendanceView-${tab}`).classList.remove('hidden');
    document.getElementById(`attTabBtn-${tab}`).classList.add('bg-white', 'shadow-sm', 'text-indigo-600');
}

async function loadAttendanceInit() { 
    document.getElementById('attendanceDate').valueAsDate = new Date(); 
    
    if (currentUser.role === 'parent') { 
        document.getElementById('attendanceTabMenu').classList.add('hidden');
        document.getElementById('attendanceView-call').classList.add('hidden');
        document.getElementById('attendanceView-report').classList.remove('hidden');
        document.getElementById('attendanceReportTitle').innerText = 'Meu Relatório de Faltas'; 
        loadParentAttendance(); 
    } else { 
        document.getElementById('attendanceTabMenu').classList.remove('hidden');
        switchAttendanceTab('call'); // Reseta a tela para a aba de fazer a chamada
        document.getElementById('attendanceReportTitle').innerText = 'Relatório da Turma'; 
        
        let classes = await getFilteredData('classes', 'name'); 
        if (currentUser.role === 'coordinator' || currentUser.role === 'teacher') { 
            classes = currentUser.class_name ? classes.filter(c => currentUser.class_name.split(', ').includes(c.name)) : []; 
        } 
        const sel = document.getElementById('attendanceClassSelect'); 
        if(sel) sel.innerHTML = '<option value="" disabled selected>Selecione a Turma...</option>' + classes.map(c => `<option value="${c.name}">${c.name}</option>`).join(''); 
    } 
}

async function loadAttendanceClass() { 
    const date = document.getElementById('attendanceDate').value, className = document.getElementById('attendanceClassSelect').value; 
    if(!date || !className) return; 
    
    const list = document.getElementById('attendanceListForm'); 
    list.innerHTML = '<div class="text-center p-6 text-xs font-bold text-gray-400">Carregando diário de classe...</div>'; 
    list.classList.remove('hidden'); document.getElementById('btnSaveAttendance').classList.add('hidden'); 
    
    let stds = await getFilteredData('students', 'name'); stds = stds.filter(s => s.class_name === className); 
    let att = await getFilteredData('attendance'); let todayAtt = att.filter(a => a.date === date); 
    
    list.innerHTML = ''; 
    if(stds.length === 0) { list.innerHTML = '<div class="text-center p-6 text-xs font-bold text-gray-400">Nenhum aluno matriculado nesta turma.</div>'; return; } 
    
    stds.forEach(s => { 
        let myRecord = todayAtt.find(a => a.student_id === s.id); 
        let isP = myRecord && myRecord.status === 'Presente' ? 'checked' : '', isF = myRecord && myRecord.status === 'Falta' ? 'checked' : ''; 
        
        // UX MELHORADA: flex-col no mobile, botões flex-1 (largos), e sm:flex-row para o PC
        list.innerHTML += `
            <div class="attendance-row flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50 hover:bg-white p-3 md:p-4 rounded-xl border border-gray-100 shadow-sm transition" data-id="${s.id}">
                <span class="font-black text-gray-800 text-sm">${s.name}</span>
                <div class="flex w-full sm:w-auto gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-inner">
                    <label class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 cursor-pointer px-3 py-2.5 hover:bg-green-100 rounded-md transition text-green-700 font-bold text-xs">
                        <input type="radio" name="att_${s.id}" value="Presente" ${isP} class="w-4 h-4 accent-green-600"> Presente
                    </label>
                    <label class="flex-1 sm:flex-none flex items-center justify-center gap-1.5 cursor-pointer px-3 py-2.5 hover:bg-red-100 rounded-md transition text-red-700 font-bold text-xs">
                        <input type="radio" name="att_${s.id}" value="Falta" ${isF} class="w-4 h-4 accent-red-600"> Falta
                    </label>
                </div>
            </div>`; 
    }); 
    
    document.getElementById('btnSaveAttendance').classList.remove('hidden'); 
    loadStaffAttendanceReport(className); 
}

async function saveBulkAttendance() { 
    const date = document.getElementById('attendanceDate').value, className = document.getElementById('attendanceClassSelect').value; 
    if(!date || !className) return; 
    
    const btn = document.getElementById('btnSaveAttendance'), origText = btn.innerText; btn.innerHTML = 'Salvando...'; 
    const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id, studentRows = document.querySelectorAll('.attendance-row'); 
    let existing = await getFilteredData('attendance'); existing = existing.filter(a => a.date === date); 
    
    const batch = db.batch(); 
    studentRows.forEach(row => { 
        const stId = row.getAttribute('data-id'), statusNode = row.querySelector(`input[name="att_${stId}"]:checked`); 
        if(statusNode) { 
            const status = statusNode.value, record = existing.find(a => a.student_id === stId); 
            if (record) { if (record.status !== status) batch.update(db.collection('attendance').doc(record.id), { status }); } 
            else { const newRef = db.collection('attendance').doc(); batch.set(newRef, { student_id: stId, date, status, school_id: schId }); } 
        } 
    }); 
    
    await batch.commit(); 
    btn.innerHTML = origText; 
    await loadStaffAttendanceReport(className);
    
    alert("Diário de classe salvo com sucesso!"); 
    switchAttendanceTab('report'); // Muda automaticamente para a aba de relatório
}

async function loadStaffAttendanceReport(className) { 
    const list = document.getElementById('attendanceReportList'); list.innerHTML = '<li class="p-3 text-xs font-bold text-gray-400">Calculando...</li>'; 
    let stds = await getFilteredData('students', 'name'); stds = stds.filter(s => s.class_name === className); 
    let att = await getFilteredData('attendance'); 
    list.innerHTML = ''; 
    if(stds.length === 0) return; 
    
    stds.forEach(s => { 
        let faltas = att.filter(a => a.student_id === s.id && a.status === 'Falta').length; 
        list.innerHTML += `<li class="p-4 border-b border-gray-100 flex justify-between items-center text-xs hover:bg-gray-100 transition"><span class="font-bold text-gray-700">${s.name}</span><span class="${faltas > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'} px-3 py-1.5 rounded-lg font-black shadow-sm">${faltas} Faltas</span></li>`; 
    }); 
}

async function loadParentAttendance() { 
    const list=document.getElementById('attendanceReportList'); list.innerHTML=''; 
    let att=await getFilteredData('attendance'); att=att.filter(a=>a.student_id===currentUser.child_id); 
    
    if(att.length===0) list.innerHTML='<li class="p-4 text-center text-gray-400 text-xs font-bold">Nenhum registro de falta no sistema.</li>'; 
    else att.forEach(a=>{ list.innerHTML+=`<li class="p-4 border-b border-gray-100 bg-white flex justify-between items-center"><span class="font-medium text-gray-600 text-xs"><i class="ph ph-calendar-blank align-middle text-lg mr-1 text-gray-400"></i> ${a.date.split('-').reverse().join('/')}</span><span class="font-black text-xs px-4 py-1.5 rounded-lg border shadow-sm ${a.status==='Presente'?'bg-green-50 text-green-600 border-green-100':'bg-red-50 text-red-600 border-red-100'}">${a.status}</span></li>`; }); 
}

// ==========================================
// EVENTOS, ANOTAÇÕES E CANTINA
// ==========================================
async function loadEvents() { const list=document.getElementById('eventsList')||document.getElementById('parentEventsList'); if(!list) return; list.innerHTML=''; let evs=await getFilteredData('events', 'event_date'); loadedEvents=evs; evs.forEach(e => { const d=e.event_date.split('-').reverse().join('/'); const canManage = (currentUser.role==='director'||currentUser.role==='coordinator'||currentUser.role==='admin'); const actions = canManage ? `<div class="flex gap-2 justify-end w-full sm:w-auto mt-2 sm:mt-0"><button onclick="startEditEvent('${e.id}')" title="Editar" class="text-blue-500 bg-blue-50 hover:bg-blue-100 p-2.5 rounded-lg transition"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${e.id}', 'event')" title="Excluir" class="text-red-500 bg-red-50 hover:bg-red-100 p-2.5 rounded-lg transition"><i class="ph ph-trash text-lg"></i></button></div>` : ''; list.innerHTML+=`<div class="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 fade-in hover:shadow-md transition"><div class="flex gap-4 items-center w-full sm:w-auto"><div class="bg-emerald-50 text-emerald-700 rounded-xl p-3 text-center w-16 shrink-0 font-black text-sm border border-emerald-100 shadow-inner">${d.substring(0,5)}<br><span class="text-[10px] font-bold text-emerald-500">${e.event_time||''}</span></div><div class="flex-grow"><strong class="text-gray-800 block text-sm font-black mb-1">${e.title}</strong><p class="text-xs text-gray-500 leading-relaxed font-medium">${e.description||''}</p></div></div>${actions}</div>`; }); }
async function handleEventSubmit(e) { e.preventDefault(); const t=document.getElementById('eventTitleInput').value.trim(); const d=document.getElementById('eventDateInput').value; const h=document.getElementById('eventTimeInput').value; const c=document.getElementById('eventDescInput').value.trim(); const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; try { if(editingEventId === null) { await db.collection('events').add({title:t, event_date:d, event_time:h, description:c, school_id:schId}); alert("Evento agendado com sucesso!"); } else { await db.collection('events').doc(editingEventId).update({title:t, event_date:d, event_time:h, description:c}); alert("Evento atualizado com sucesso!"); } cancelEventEdit(); loadEvents(); } catch (err) { alert("Erro ao salvar o evento."); } }
function startEditEvent(id) { const ev = loadedEvents.find(x => x.id === id); if(!ev) return; editingEventId = id; document.getElementById('eventTitleInput').value = ev.title; document.getElementById('eventDateInput').value = ev.event_date; document.getElementById('eventTimeInput').value = ev.event_time || ''; document.getElementById('eventDescInput').value = ev.description || ''; document.getElementById('eventFormTitle').innerHTML = `<i class="ph ph-pencil-simple"></i> Editar Evento`; document.getElementById('submitEventBtn').innerText = 'Atualizar Evento'; document.getElementById('btnCancelEvent').classList.remove('hidden'); document.getElementById('eventFormContainer').scrollIntoView({behavior: 'smooth', block: 'start'}); }
function cancelEventEdit() { editingEventId = null; document.getElementById('eventForm').reset(); document.getElementById('eventFormTitle').innerHTML = `<i class="ph ph-calendar-plus"></i> Agendar Novo Evento`; document.getElementById('submitEventBtn').innerText = 'Confirmar Data'; document.getElementById('btnCancelEvent').classList.add('hidden'); }
async function loadNotes() { const container = document.getElementById('notesListContainer'); if(!container) return; container.innerHTML = '<div class="col-span-full text-center p-4 text-xs font-bold text-gray-400">Carregando anotações...</div>'; try { let notes = await getFilteredData('notes', 'timestamp'); notes = notes.filter(n => n.author_id === currentUser.id).reverse(); loadedNotes = notes; container.innerHTML = ''; if(notes.length === 0) { container.innerHTML = '<div class="col-span-full text-center p-8 text-xs font-medium text-gray-400">Você ainda não tem anotações.</div>'; return; } notes.forEach(n => { let contentHtml = ''; if(n.type === 'list') { let items = n.content.split('\n').filter(i => i.trim() !== ''); contentHtml = '<div class="space-y-1.5 mt-1">' + items.map((i, idx) => { let isChecked = i.trim().startsWith('✓'); let text = i.replace(/^[\u2022\u2713\-\*\[\]xX\s]+/, '').trim(); return `<label class="flex items-start gap-2 cursor-pointer group text-xs font-medium"><input type="checkbox" class="mt-0.5 w-3.5 h-3.5 accent-yellow-500 rounded border-gray-300" ${isChecked ? 'checked' : ''} onchange="toggleNoteItem('${n.id}', ${idx}, this.checked)"><span class="${isChecked ? 'line-through text-gray-400' : 'text-gray-700'}">${text}</span></label>`; }).join('') + '</div>'; } else { contentHtml = `<p class="text-xs text-gray-600 whitespace-pre-wrap font-medium">${n.content}</p>`; } const dateStr = new Date(n.timestamp).toLocaleDateString('pt-BR'); container.innerHTML += `<div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col group relative overflow-hidden h-48"><div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition flex gap-1 z-10 bg-white/80 backdrop-blur rounded-lg p-1"><button onclick="startEditNote('${n.id}')" class="text-gray-400 hover:text-[rgb(8,33,223)] p-1.5 rounded"><i class="ph ph-pencil-simple text-sm"></i></button><button onclick="openDeleteModal('${n.id}', 'note')" class="text-gray-400 hover:text-red-500 p-1.5 rounded"><i class="ph ph-trash text-sm"></i></button></div><h5 class="font-black text-sm text-gray-800 mb-1 pr-12 truncate">${n.title}</h5><span class="text-[9px] font-black text-yellow-600 uppercase tracking-wider mb-3">${dateStr} • ${n.type === 'list' ? 'Lista de Tarefas' : 'Texto Livre'}</span><div class="flex-grow overflow-y-auto no-scrollbar relative pr-2">${contentHtml}</div></div>`; }); } catch (err) { console.error(err); } }
async function toggleNoteItem(noteId, itemIndex, isChecked) { const note = loadedNotes.find(x => x.id === noteId); if (!note) return; let lines = note.content.split('\n'); let currentIdx = 0; for (let i = 0; i < lines.length; i++) { if (lines[i].trim() !== '') { if (currentIdx === itemIndex) { let text = lines[i].replace(/^[\u2022\u2713\-\*\[\]xX\s]+/, '').trim(); lines[i] = (isChecked ? '✓ ' : '• ') + text; break; } currentIdx++; } } note.content = lines.join('\n'); loadNotes(); try { await db.collection('notes').doc(noteId).update({ content: note.content }); } catch(e) { console.error(e); } }
async function handleNoteSubmit(e) { e.preventDefault(); const title = document.getElementById('noteTitle').value.trim(); const type = document.getElementById('noteType').value; const content = document.getElementById('noteContent').value.trim(); const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; const btn = document.getElementById('btnSaveNote'); const orig = btn.innerText; btn.innerText = 'Salvando...'; try { if (editingNoteId === null) { await db.collection('notes').add({ title, type, content, author_id: currentUser.id, school_id: schId, timestamp: Date.now() }); } else { await db.collection('notes').doc(editingNoteId).update({ title, type, content }); } cancelNoteEdit(); loadNotes(); } catch (err) { alert("Erro ao salvar anotação."); } finally { btn.innerText = orig; } }
function startEditNote(id) { const note = loadedNotes.find(x => x.id === id); if(!note) return; editingNoteId = id; document.getElementById('noteTitle').value = note.title; document.getElementById('noteType').value = note.type || 'text'; document.getElementById('noteContent').value = note.content; document.getElementById('noteFormTitle').innerText = 'Editar Anotação'; document.getElementById('btnSaveNote').innerText = 'Atualizar Anotação'; document.getElementById('btnCancelNote').classList.remove('hidden'); }
function cancelNoteEdit() { editingNoteId = null; document.getElementById('noteForm').reset(); document.getElementById('noteFormTitle').innerText = 'Nova Anotação'; document.getElementById('btnSaveNote').innerText = 'Salvar Anotação'; document.getElementById('btnCancelNote').classList.add('hidden'); }

async function loadCanteen() { const container = document.getElementById('canteenCardsContainer'); const formBox = document.getElementById('canteenFormContainer'); if(!container) return; if(['director', 'coordinator', 'admin'].includes(currentUser.role)) { if(formBox) formBox.classList.remove('hidden'); } else { if(formBox) formBox.classList.add('hidden'); } container.innerHTML = '<div class="text-center p-6 text-xs font-bold text-gray-400">Carregando cardápio da semana...</div>'; try { const menuData = await getFilteredData('canteen'); const weekDays = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"]; loadedCanteen = menuData; container.innerHTML = ''; weekDays.forEach(day => { let match = menuData.find(m => m.day === day); let meal = match ? match.meal : "🍽️ Nenhuma merenda registrada para este dia."; let dessert = match ? match.dessert : "Nenhum acompanhamento"; container.innerHTML += `<div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center gap-4 fade-in"><div><span class="text-[9px] font-black uppercase text-orange-600 tracking-wider bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100">${day}</span><h4 class="text-sm font-black text-gray-800 mt-2">${day === match?.day ? meal : `<span class="text-gray-400 font-medium">${meal}</span>`}</h4><p class="text-[11px] text-gray-400 font-medium mt-1"><i class="ph ph-cookie"></i> Sobremesa/Bebida: <span class="text-gray-600 font-bold">${dessert}</span></p></div>${['director', 'coordinator', 'admin'].includes(currentUser.role) && match ? `<div class="flex gap-1"><button onclick="startEditCanteen('${match.id}')" title="Editar" class="text-gray-400 hover:text-orange-500 p-2 rounded-xl transition"><i class="ph ph-pencil-simple text-lg"></i></button><button onclick="openDeleteModal('${match.id}', 'canteen')" title="Excluir" class="text-gray-400 hover:text-red-500 p-2 rounded-xl transition"><i class="ph ph-trash text-lg"></i></button></div>` : ''}</div>`; }); } catch(e) { container.innerHTML = '<div class="text-center p-4 text-xs font-bold text-red-400">Erro ao processar cardápio.</div>'; } }
async function saveCanteenMenu(e) { e.preventDefault(); const day = document.getElementById('canteenDay').value; const meal = document.getElementById('canteenMeal').value.trim(); const dessert = document.getElementById('canteenDessert').value.trim(); const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; const btn = document.getElementById('btnSaveCanteen'); btn.innerText = "Publicando..."; try { if (editingCanteenId !== null) { await db.collection('canteen').doc(editingCanteenId).update({ day, meal, dessert }); } else { let existing = await getFilteredData('canteen'); let match = existing.find(m => m.day === day); if(match) { await db.collection('canteen').doc(match.id).update({ meal, dessert }); } else { await db.collection('canteen').add({ day, meal, dessert, school_id: schId }); } } cancelCanteenEdit(); alert("Cardápio semanal atualizado!"); loadCanteen(); } catch(err) { alert("Erro de conexão ao salvar cardápio."); } finally { btn.innerText = "Publicar Cardápio"; } }
function startEditCanteen(id) { const item = loadedCanteen.find(x => x.id === id); if(!item) return; editingCanteenId = id; document.getElementById('canteenDay').value = item.day; document.getElementById('canteenMeal').value = item.meal; document.getElementById('canteenDessert').value = item.dessert; document.getElementById('btnSaveCanteen').innerText = 'Atualizar Cardápio'; if(document.getElementById('btnCancelCanteen')) { document.getElementById('btnCancelCanteen').classList.remove('hidden'); } }
function cancelCanteenEdit() { editingCanteenId = null; document.getElementById('canteenMeal').value = ''; document.getElementById('canteenDessert').value = ''; document.getElementById('btnSaveCanteen').innerText = 'Publicar Cardápio'; if(document.getElementById('btnCancelCanteen')) { document.getElementById('btnCancelCanteen').classList.add('hidden'); } }

// ==========================================
// CHAT - ESTILO WHATSAPP/TELEGRAM
// ==========================================
async function renderChatContacts() {
    const list = document.getElementById('chatContactsList'); if(!list) return;
    let msgs = await getFilteredData('messages', 'timestamp'); let users = await getFilteredData('users'); let students = await getFilteredData('students');
    let myClasses = [];
    if (currentUser.role === 'teacher' || currentUser.role === 'coordinator') { if (currentUser.class_name) myClasses = currentUser.class_name.split(', '); } 
    else if (currentUser.role === 'parent') { let childIds = String(currentUser.child_id).split(',').map(s=>s.trim()); let myChildren = students.filter(s => childIds.includes(String(s.id))); myClasses = myChildren.map(c => c.class_name); }

    msgs = msgs.filter(m => {
        let rec = m.recipient || 'SCOPE_ALL';
        if (rec === 'ALL' || rec === 'SCOPE_ALL') { 
            if (m.sender_role === 'director' || currentUser.role === 'director') return true; 
            if (m.sender_role === 'coordinator') { 
                if (currentUser.role !== 'parent') return true; 
                let senderClasses = m.sender_classes ? m.sender_classes.split(', ') : []; 
                return myClasses.some(c => senderClasses.includes(c)); 
            } 
            return true; 
        }
        if (rec.startsWith('CLASS_')) return currentUser.role === 'director' || myClasses.includes(rec.replace('CLASS_', ''));
        if (rec.startsWith('USER_')) return rec.replace('USER_', '') === currentUser.id || m.sender_id === currentUser.id;
        return false;
    });

    let threads = {};
    msgs.forEach(m => {
        let rec = m.recipient || 'SCOPE_ALL';
        let threadId = ''; let isGroup = false;
        if (rec === 'SCOPE_ALL' || rec === 'ALL' || rec.startsWith('CLASS_')) { 
            threadId = (rec === 'ALL') ? 'SCOPE_ALL' : rec; 
            isGroup = true; 
        } else { 
            let targetId = m.sender_id === currentUser.id ? rec.replace('USER_', '') : m.sender_id; 
            threadId = 'USER_' + targetId; 
        }
        if (!threads[threadId] || threads[threadId].timestamp < m.timestamp) { 
            threads[threadId] = { id: threadId, type: isGroup ? 'GROUP' : 'USER', lastMessage: m.is_deleted ? '🚫 Mensagem apagada' : m.message_text, timestamp: m.timestamp, sender_name: m.sender_name }; 
        }
    });

    let sortedThreads = Object.values(threads).sort((a,b) => b.timestamp - a.timestamp);
    if(sortedThreads.length === 0) { list.innerHTML = `<div class="p-8 text-center text-xs text-gray-400 font-medium">Nenhum chat ativo.<br>Clique no botão "+" acima para buscar contatos.</div>`; return; }

    let html = '';
    sortedThreads.forEach(t => {
        let name = ''; let avatar = ''; let statusBadge = '';
        if (t.type === 'GROUP') { 
            if (t.id === 'SCOPE_ALL') {
                name = currentUser.role === 'director' ? 'Todos da Escola' : 'Minhas Turmas e Equipe';
                avatar = generateGroupAvatar(currentUser.role === 'director' ? 'Escola' : 'Coordenação'); 
            } else {
                let className = t.id.replace('CLASS_', '');
                name = 'Turma ' + className; 
                avatar = generateGroupAvatar(className); 
            }
        } else {
            let targetUid = t.id.replace('USER_', ''); let uObj = users.find(u => u.id === targetUid);
            if (uObj) { name = uObj.name.replace(/\(.*?\)/g, '').trim(); avatar = uObj.avatar_url || generateAvatar(uObj.name, uObj.role); statusBadge = uObj.status ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 ml-1.5 shrink-0">${statusLabels[uObj.status] || uObj.status}</span>` : ''; } 
            else { name = 'Ex-Colaborador'; avatar = generateAvatar('?', 'parent'); }
        }
        const timeStr = new Date(t.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        html += `<div onclick="openChat('${t.id}', '${t.type}', '${name.replace(/'/g, "\\'")}', '${avatar}')" class="chat-contact-item flex items-center gap-3.5 p-3.5 cursor-pointer hover:bg-gray-50 transition border-b border-gray-50"><img src="${avatar}" class="w-12 h-12 rounded-full object-cover shrink-0 border-2 border-gray-100 shadow-sm"><div class="flex-grow overflow-hidden"><div class="flex justify-between items-center mb-0.5"><h4 class="text-sm font-black text-gray-800 truncate flex items-center">${name}${statusBadge}</h4><span class="text-[9px] text-gray-400 font-bold">${timeStr}</span></div><p class="text-[11px] font-bold text-gray-400 truncate">${t.type==='GROUP'?`<b>${t.sender_name.replace(/\(.*?\)/g, '').trim()}:</b> `:''}${t.lastMessage || '📂 Anexo'}</p></div></div>`;
    });
    list.innerHTML = html;
}

async function openNewChatModal() {
    const modal = document.getElementById('newChatModal'); const list = document.getElementById('newChatContactsList'); if(!modal || !list) return; modal.classList.remove('hidden');
    list.innerHTML = '<div class="p-6 text-center text-xs text-gray-400 font-bold">Buscando diretório escolar...</div>';

    let users = await getFilteredData('users', 'name'); let classes = await getFilteredData('classes', 'name'); let students = await getFilteredData('students');
    let myClasses = [];
    if (currentUser.role === 'teacher' || currentUser.role === 'coordinator') { if (currentUser.class_name) myClasses = currentUser.class_name.split(', '); } 
    else if (currentUser.role === 'parent') { let childIds = String(currentUser.child_id).split(',').map(s=>s.trim()); let myChildren = students.filter(s => childIds.includes(String(s.id))); myClasses = myChildren.map(c => c.class_name); }

    let html = '';
    const renderContactRow = (id, type, name, label, avatar, statusStr="") => {
        let statusTag = statusStr ? `<span class="text-[9px] font-bold text-gray-400 ml-1.5">${statusLabels[statusStr] || statusStr}</span>` : '';
        return `<div onclick="selectNewChatContact('${id}', '${type}', '${name.replace(/'/g, "\\'")}', '${avatar}')" class="new-chat-row flex items-center gap-3 p-3 cursor-pointer hover:bg-purple-50/50 transition border-b border-gray-50"><img src="${avatar}" class="w-10 h-10 rounded-full object-cover shrink-0"><div class="overflow-hidden flex-grow"><h4 class="text-xs font-black text-gray-800 truncate flex items-center">${name}${statusTag}</h4><p class="text-[10px] font-bold text-purple-600 uppercase tracking-wide">${label}</p></div></div>`;
    };

    if (currentUser.role === 'director') {
        html += createHeadingSection('Grupos da Escola'); html += renderContactRow('SCOPE_ALL', 'GROUP', 'Todos da Escola', 'Canal Geral', generateGroupAvatar('Escola'));
        if(classes.length > 0) classes.forEach(c => html += renderContactRow(`CLASS_${c.name}`, 'GROUP', `Turma ${c.name}`, 'Grupo da Sala', generateGroupAvatar(c.name)));
        html += createHeadingSection('Contatos Individuais');
        users.filter(u => u.id !== currentUser.id && u.role !== 'admin').forEach(u => html += renderContactRow(`USER_${u.id}`, 'USER', u.name.replace(/\(.*?\)/g, '').trim(), roleLabels[u.role] || u.role, u.avatar_url || generateAvatar(u.name, u.role), u.status));
    } 
    else if (currentUser.role === 'coordinator') {
        html += createHeadingSection('Meus Grupos'); html += renderContactRow('SCOPE_ALL', 'GROUP', 'Minhas Turmas e Equipe', 'Canal Geral', generateGroupAvatar('Coordenação'));
        if(myClasses.length > 0) myClasses.forEach(c => html += renderContactRow(`CLASS_${c}`, 'GROUP', `Turma ${c}`, 'Grupo da Sala', generateGroupAvatar(c)));
        html += createHeadingSection('Equipe Escolar');
        users.filter(u => u.id !== currentUser.id && ['director', 'coordinator', 'teacher'].includes(u.role)).forEach(u => html += renderContactRow(`USER_${u.id}`, 'USER', u.name.replace(/\(.*?\)/g, '').trim(), roleLabels[u.role], u.avatar_url || generateAvatar(u.name, u.role), u.status));
        html += createHeadingSection('Responsáveis (Minhas Turmas)');
        let myStudents = students.filter(s => myClasses.includes(s.class_name)); let myStudentIds = myStudents.map(s => s.id);
        users.filter(u => u.role === 'parent' && myStudentIds.includes(u.child_id)).forEach(u => html += renderContactRow(`USER_${u.id}`, 'USER', u.name.replace(/\(.*?\)/g, '').trim(), 'Responsável', u.avatar_url || generateAvatar(u.name, u.role), u.status));
    }
    else if (currentUser.role === 'teacher') {
        if(myClasses.length > 0) { html += createHeadingSection('Minhas Turmas'); myClasses.forEach(c => html += renderContactRow(`CLASS_${c}`, 'GROUP', `Turma ${c}`, 'Grupo da Sala', generateGroupAvatar(c))); }
        html += createHeadingSection('Equipe Escolar');
        users.filter(u => u.id !== currentUser.id && ['director', 'coordinator', 'teacher'].includes(u.role)).forEach(u => html += renderContactRow(`USER_${u.id}`, 'USER', u.name.replace(/\(.*?\)/g, '').trim(), roleLabels[u.role], u.avatar_url || generateAvatar(u.name, u.role), u.status));
        html += createHeadingSection('Responsáveis (Minhas Turmas)');
        let myStudents = students.filter(s => myClasses.includes(s.class_name)); let myStudentIds = myStudents.map(s => s.id);
        users.filter(u => u.role === 'parent' && myStudentIds.includes(u.child_id)).forEach(u => html += renderContactRow(`USER_${u.id}`, 'USER', u.name.replace(/\(.*?\)/g, '').trim(), 'Responsável', u.avatar_url || generateAvatar(u.name, u.role), u.status));
    }
    else if (currentUser.role === 'parent') {
        html += createHeadingSection('Contatos Escolares Autorizados');
        let allowedStaff = users.filter(u => u.id !== currentUser.id && (u.role === 'director' || (['coordinator', 'teacher'].includes(u.role) && u.class_name && myClasses.some(mc => u.class_name.includes(mc)))));
        allowedStaff.forEach(u => html += renderContactRow(`USER_${u.id}`, 'USER', u.name.replace(/\(.*?\)/g, '').trim(), roleLabels[u.role], u.avatar_url || generateAvatar(u.name, u.role), u.status));
    }
    list.innerHTML = html;
}

function createHeadingSection(title) { return `<div class="bg-purple-50 text-[10px] font-black text-purple-700 uppercase px-3 py-1.5 mt-2 rounded-lg tracking-wider">${title}</div>`; }
function closeNewChatModal() { document.getElementById('newChatModal').classList.add('hidden'); document.getElementById('newChatSearchInput').value = ''; }
function filterNewChatContacts() { const term = document.getElementById('newChatSearchInput').value.toLowerCase(); document.querySelectorAll('.new-chat-row').forEach(el => { const text = el.innerText.toLowerCase(); el.style.display = text.includes(term) ? '' : 'none'; }); }
function selectNewChatContact(id, type, name, avatar) { closeNewChatModal(); openChat(id, type, name, avatar); }

function openChat(id, type, name, avatar) {
    activeChatId = id; activeChatType = type; activeChatName = name; activeChatAvatar = avatar;
    document.getElementById('activeChatName').innerText = name; document.getElementById('activeChatStatus').innerText = type === 'GROUP' ? 'Grupo Oficial' : 'Conversa Segura'; document.getElementById('activeChatAvatar').src = avatar; document.getElementById('chatInputArea').classList.remove('hidden');
    const box = document.getElementById('chatMessagesBox');
    if(box) box.innerHTML = '<div class="absolute inset-0 flex items-center justify-center pointer-events-none"><div class="bg-white/90 backdrop-blur px-8 py-4 rounded-full shadow-lg text-xs font-bold text-gray-500 border border-gray-100">Carregando conversa...</div></div>';
    if (window.innerWidth < 768) { document.getElementById('chatSidebar').classList.add('hidden'); document.getElementById('chatArea').classList.remove('hidden'); document.getElementById('chatArea').classList.add('flex'); }
    loadChat();
}

function closeChatAreaMobile() { document.getElementById('chatSidebar').classList.remove('hidden'); document.getElementById('chatArea').classList.add('hidden'); document.getElementById('chatArea').classList.remove('flex'); activeChatId = null; renderChatContacts(); }
function filterChatContacts() { const term = document.getElementById('chatSearchInput').value.toLowerCase(); document.querySelectorAll('.chat-contact-item').forEach(el => { const name = el.getAttribute('data-name'); el.style.display = name.includes(term) ? '' : 'none'; }); }
function handleFileSelection() { const fileInput = document.getElementById('chatFileInput'); if (fileInput && fileInput.files.length > 0) { const file = fileInput.files[0]; if (file.size > 1.5 * 1024 * 1024) { alert("O arquivo é muito grande. O limite máximo é de 1.5MB."); clearFileSelection(); return; } selectedFileName = file.name; document.getElementById('fileNameDisplay').innerText = selectedFileName; document.getElementById('chatAttachmentPreview').classList.remove('hidden'); const reader = new FileReader(); reader.onload = function(e) { selectedFileBase64 = e.target.result; }; reader.readAsDataURL(file); } }
function clearFileSelection() { selectedFileName = null; selectedFileBase64 = null; if(document.getElementById('chatFileInput')) document.getElementById('chatFileInput').value = ''; document.getElementById('chatAttachmentPreview').classList.add('hidden'); }

async function sendMessage(e) { 
    e.preventDefault(); 
    try {
        const input = document.getElementById('chatMessageInput'); if(!input || !activeChatId) return; const text = input.value.trim(); if (!text && !selectedFileName) return; 
        const schId = currentUser.role === 'admin' ? currentAdminSchoolId : currentUser.school_id; 
        const btn = document.getElementById('btnSendMessage'); const origHTML = btn.innerHTML; btn.innerHTML = '<span class="loader border-t-transparent border-[rgb(8,33,223)] w-5 h-5"></span>';
        const p = { sender_id: currentUser.id, sender_name: currentUser.name, sender_role: currentUser.role, sender_avatar: currentUser.avatar_url, sender_classes: currentUser.class_name || '', recipient: activeChatId, message_text: text, file_name: selectedFileName || null, file_data: selectedFileBase64 || null, timestamp: Date.now(), school_id: schId, is_edited: false, is_deleted: false }; 
        input.value = ''; clearFileSelection(); await db.collection('messages').add(p); 
        await loadChat(); await renderChatContacts(); 
        btn.innerHTML = origHTML;
    } catch(err) { console.error(err); alert("Erro ao enviar mensagem."); }
}

function downloadRealAttachment(msgId, fileName) { const base64Data = window.chatAttachments[msgId]; if(!base64Data) { alert("O arquivo não está disponível ou foi corrompido."); return; } const a = document.createElement('a'); a.href = base64Data; a.download = fileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
async function editChatMessage(id) { const msg = loadedMessages.find(x => x.id === id); if(!msg) return; const newText = prompt("Edite sua mensagem:", msg.message_text); if(newText !== null && newText.trim() !== "" && newText !== msg.message_text) { try { await db.collection('messages').doc(id).update({ message_text: newText.trim(), is_edited: true }); loadChat(); } catch(e) { alert("Erro ao editar."); } } }
async function deleteChatMessage(id) { if(confirm("Deseja apagar esta mensagem para todos?")) { try { await db.collection('messages').doc(id).update({ message_text: "🚫 Mensagem apagada pelo autor.", file_name: null, file_data: null, is_deleted: true }); loadChat(); } catch(e) { alert("Erro ao apagar."); } } }

async function loadChat() { 
    const box = document.getElementById('chatMessagesBox'); if(!box || !activeChatId) return; 
    const fetchId = activeChatId; currentRenderId = fetchId;
    window.chatAttachments = {}; let msgs = await getFilteredData('messages', 'timestamp'); let users = await getFilteredData('users');
    
    if (currentRenderId !== fetchId) return;

    if (activeChatType === 'USER') { let targetUid = activeChatId.replace('USER_', ''); let uObj = users.find(u => u.id === targetUid); if (uObj && uObj.status) document.getElementById('activeChatStatus').innerText = statusLabels[uObj.status] || uObj.status; }
    
    msgs = msgs.filter(m => {
        let rec = m.recipient || 'SCOPE_ALL';
        if (activeChatType === 'GROUP') { return rec === activeChatId || (activeChatId === 'SCOPE_ALL' && rec === 'ALL'); } 
        else if (activeChatType === 'USER') { const targetUserId = activeChatId.replace('USER_', ''); return (m.sender_id === currentUser.id && rec === activeChatId) || (m.sender_id === targetUserId && rec === `USER_${currentUser.id}`); }
        return false;
    });

    loadedMessages = msgs; box.innerHTML = ''; 
    if(msgs.length === 0) { box.innerHTML = `<div class="absolute inset-0 flex items-center justify-center pointer-events-none"><div class="bg-white/90 backdrop-blur px-8 py-4 rounded-full shadow-lg text-xs font-bold text-gray-500 border border-gray-100"><i class="ph ph-hand-waving text-lg align-middle mr-1 text-[rgb(8,33,223)]"></i> Envie a primeira mensagem para começar.</div></div>`; }
    
    msgs.forEach(m => { 
        const isMe = m.sender_id === currentUser.id; const bubbleClass = isMe ? 'bg-[#d9fdd3] text-gray-800 ml-auto rounded-tr-none' : 'bg-white text-gray-800 mr-auto rounded-tl-none'; const labelRole = roleLabels[m.sender_role] || 'Usuário'; 
        let currentSender = users.find(u => u.id === m.sender_id); const avatarToUse = currentSender?.avatar_url || m.sender_avatar || generateAvatar(m.sender_name, m.sender_role);
        let attachmentHtml = ''; if(m.file_name && !m.is_deleted) { if(m.file_data) window.chatAttachments[m.id] = m.file_data; attachmentHtml = `<div onclick="downloadRealAttachment('${m.id}', '${m.file_name}')" class="mt-2 p-2.5 rounded-lg bg-black/5 hover:bg-black/10 transition text-[11px] cursor-pointer flex items-center gap-2 font-bold border border-black/5" title="Baixar anexo"><i class="ph ph-file-text text-lg shrink-0 opacity-70"></i><span class="truncate flex-grow text-left">${m.file_name}</span><i class="ph ph-download text-sm shrink-0 opacity-70"></i></div>`; }
        const editedLabel = m.is_edited && !m.is_deleted ? '<span class="text-[9px] italic opacity-60 ml-2 font-bold">(editada)</span>' : ''; const displayText = m.is_deleted ? `<i class="ph ph-prohibit align-middle"></i> Mensagem apagada pelo autor.` : (m.message_text || ''); const textClass = m.is_deleted ? 'italic opacity-60' : 'font-medium';
        const actions = (isMe && !m.is_deleted) ? `<div class="flex justify-end gap-2 mt-1 pt-1 opacity-0 group-hover:opacity-100 transition absolute right-2 top-1.5"><button onclick="editChatMessage('${m.id}')" title="Editar" class="text-gray-400 hover:text-[rgb(8,33,223)] bg-white/90 backdrop-blur rounded p-1 shadow-sm"><i class="ph ph-pencil-simple text-sm"></i></button><button onclick="deleteChatMessage('${m.id}')" title="Apagar" class="text-gray-400 hover:text-red-500 bg-white/90 backdrop-blur rounded p-1 shadow-sm"><i class="ph ph-trash text-sm"></i></button></div>` : '';
        let msgHtml = ''; const timeStr = new Date(m.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        if (isMe) { msgHtml = `<div class="flex justify-end mb-3 w-full fade-in group relative"><div class="max-w-[85%] p-3 rounded-2xl shadow-sm text-sm relative ${bubbleClass}"><p class="leading-relaxed whitespace-pre-wrap pr-12 ${textClass}">${displayText}</p>${attachmentHtml}<span class="text-[9px] text-gray-500 float-right mt-1 ml-2 font-bold">${timeStr}${editedLabel}</span>${actions}</div></div>`; } 
        else { msgHtml = `<div class="flex justify-start mb-3 w-full fade-in"><img src="${avatarToUse}" class="w-9 h-9 rounded-full border border-gray-200 bg-white mr-3 mt-auto shrink-0 object-cover shadow-sm"><div class="max-w-[80%] p-3 rounded-2xl shadow-sm text-sm relative ${bubbleClass}"><span class="text-[10px] font-black block mb-1 ${m.sender_role === 'director' ? 'text-red-500' : 'text-[rgb(8,33,223)]'}">${m.sender_name.replace(/\(.*?\)/g, '').trim()} <span class="font-bold text-gray-400 text-[9px] uppercase tracking-wider ml-1">(${labelRole})</span></span><p class="leading-relaxed whitespace-pre-wrap pr-12 ${textClass}">${displayText}</p>${attachmentHtml}<span class="text-[9px] text-gray-400 float-right mt-1 ml-2 font-bold">${timeStr}${editedLabel}</span></div></div>`; }
        box.innerHTML += msgHtml; 
    }); 
    box.scrollTop = box.scrollHeight; 
}

// ==========================================
// EXCLUSÃO GERAL DO SISTEMA 
// ==========================================
function openDeleteModal(id, type) { deletingEventId = id; deleteType = type; document.getElementById('deleteModal').classList.remove('hidden'); }
function closeDeleteModal() { deletingEventId = null; deleteType = null; document.getElementById('deleteModal').classList.add('hidden'); }
async function executeDeleteEvent() { 
    const col = deleteType==='user'?'users':(deleteType==='student'?'students':(deleteType==='class'?'classes':(deleteType==='subject'?'subjects':(deleteType==='school'?'schools':(deleteType==='grade'?'grades':(deleteType==='global_subject'?'global_subjects':(deleteType==='note'?'notes':(deleteType==='canteen'?'canteen':'events')))))))); 
    if(deleteType==='user') { await db.collection('users').doc(deletingEventId).delete(); } else await db.collection(col).doc(deletingEventId).delete(); 
    closeDeleteModal(); 
    if(deleteType==='event') loadEvents(); if(deleteType==='student') loadAdminStudents(); if(deleteType==='user') loadAdminStaff(); if(deleteType==='class') loadAdminClasses(); if(deleteType==='subject' || deleteType==='global_subject') loadAdminSubjects(); 
    if(deleteType==='school') { loadAdminSchools(); populateAdminSchoolsDropdown(); } 
    if(deleteType==='grade') { const sName = document.getElementById('lblSelectedStudentName').innerText; const sClass = document.getElementById('selectedStudentClassLbl').innerText; selectStudentForGrades(currentGradeStudentId, sName, sClass); } 
    if(deleteType==='note') loadNotes(); if(deleteType==='canteen') loadCanteen();
}
