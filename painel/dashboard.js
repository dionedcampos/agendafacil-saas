// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Variáveis Globais ---
let serviceEditMode = false, serviceIdToEdit = null;
let profEditMode = false, profIdToEdit = null;
let allServices = []; 
let calendar;
let appointmentModal;

// --- Elementos do HTML ---
const userEmailElement = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const addServiceForm = document.getElementById('add-service-form');
const servicesListUl = document.getElementById('services-list-ul');
const serviceFormSubmitButton = addServiceForm.querySelector('button[type="submit"]');
const addProfessionalForm = document.getElementById('add-professional-form');
const professionalsListUl = document.getElementById('professionals-list-ul');
const professionalNameInput = document.getElementById('professional-name');
const profFormSubmitButton = addProfessionalForm.querySelector('button[type="submit"]');
const servicesChecklistDiv = document.getElementById('professional-services-checklist');

// --- AUTENTICAÇÃO ---
auth.onAuthStateChanged((user) => {
    if (user) {
        userEmailElement.textContent = user.email;
        loadServices(user.uid);
        loadProfessionals(user.uid);
        initializeCalendar(user.uid);
    } else { 
        window.location.href = 'index.html'; 
    }
});

logoutButton.addEventListener('click', () => { auth.signOut(); });

// --- CRUD DE SERVIÇOS ---
function loadServices(userId) {
    db.collection('negocios').doc(userId).collection('servicos').onSnapshot((snapshot) => {
        servicesListUl.innerHTML = '';
        allServices = [];
        snapshot.forEach(doc => {
            const service = doc.data();
            const serviceId = doc.id;
            allServices.push({ id: serviceId, ...service });
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `<span>${service.nome} - ${service.duracao} min - R$ ${service.preco.toFixed(2)}</span><div><button class="btn btn-sm btn-warning me-2 edit-btn" data-id="${serviceId}">Editar</button><button class="btn btn-sm btn-danger delete-btn" data-id="${serviceId}">Excluir</button></div>`;
            servicesListUl.appendChild(li);
        });
        renderServicesChecklist();
    });
}
addServiceForm.addEventListener('submit', (e) => { e.preventDefault(); const user = auth.currentUser; if (!user) return; const serviceData = { nome: document.getElementById('service-name').value, descricao: document.getElementById('service-desc').value, duracao: Number(document.getElementById('service-duration').value), preco: Number(document.getElementById('service-price').value) }; if (serviceEditMode) { db.collection('negocios').doc(user.uid).collection('servicos').doc(serviceIdToEdit).update(serviceData).then(() => resetServiceForm()); } else { db.collection('negocios').doc(user.uid).collection('servicos').add(serviceData).then(() => addServiceForm.reset()); } });
servicesListUl.addEventListener('click', (e) => { const userId = auth.currentUser.uid; if (!userId) return; if (e.target.classList.contains('delete-btn')) { if (confirm("Tem certeza?")) db.collection('negocios').doc(userId).collection('servicos').doc(e.target.dataset.id).delete(); } if (e.target.classList.contains('edit-btn')) { const serviceId = e.target.dataset.id; db.collection('negocios').doc(userId).collection('servicos').doc(serviceId).get().then(doc => { if (doc.exists) { const service = doc.data(); document.getElementById('service-name').value = service.nome; document.getElementById('service-desc').value = service.descricao; document.getElementById('service-duration').value = service.duracao; document.getElementById('service-price').value = service.preco; serviceEditMode = true; serviceIdToEdit = serviceId; serviceFormSubmitButton.textContent = 'Atualizar Serviço'; addServiceForm.scrollIntoView({ behavior: 'smooth' }); } }); } });
function resetServiceForm() { addServiceForm.reset(); serviceEditMode = false; serviceIdToEdit = null; serviceFormSubmitButton.textContent = 'Salvar Serviço'; }

// --- CRUD DE PROFISSIONAIS ---
function renderServicesChecklist(professionalServices = {}) {
    if(!servicesChecklistDiv) return;
    servicesChecklistDiv.innerHTML = '';
    if (allServices.length === 0) { servicesChecklistDiv.innerHTML = '<p class="text-muted">Nenhum serviço cadastrado.</p>'; return; }
    allServices.forEach(service => {
        const isChecked = professionalServices[service.id] ? 'checked' : '';
        servicesChecklistDiv.innerHTML += `<div class="form-check"><input class="form-check-input" type="checkbox" value="${service.id}" id="service-${service.id}" ${isChecked}><label class="form-check-label" for="service-${service.id}">${service.nome}</label></div>`;
    });
}
const diasDaSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
addProfessionalForm.addEventListener('submit', (e) => { e.preventDefault(); const user = auth.currentUser; if (!user) return; const servicosOferecidos = {}; const selectedCheckboxes = servicesChecklistDiv.querySelectorAll('input[type="checkbox"]:checked'); selectedCheckboxes.forEach(checkbox => { servicosOferecidos[checkbox.value] = true; }); const professionalData = { nome: professionalNameInput.value, servicosOferecidos, horariosTrabalho: {} }; diasDaSemana.forEach(dia => { const inicio = document.getElementById(`${dia}-inicio`).value; const fim = document.getElementById(`${dia}-fim`).value; professionalData.horariosTrabalho[dia] = { inicio, fim }; }); if (profEditMode) { db.collection('negocios').doc(user.uid).collection('profissionais').doc(profIdToEdit).update(professionalData).then(() => resetProfessionalForm()); } else { db.collection('negocios').doc(user.uid).collection('profissionais').add(professionalData).then(() => resetProfessionalForm()); } });
function loadProfessionals(userId) {
    db.collection('negocios').doc(userId).collection('profissionais').onSnapshot((snapshot) => {
        professionalsListUl.innerHTML = '';
        snapshot.forEach(doc => {
            const professional = doc.data();
            const professionalId = doc.id;
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `<span>${professional.nome}</span><div><button class="btn btn-sm btn-warning me-2 edit-prof-btn" data-id="${professionalId}">Editar</button><button class="btn btn-sm btn-danger delete-prof-btn" data-id="${professionalId}">Excluir</button></div>`;
            professionalsListUl.appendChild(li);
        });
    });
}
professionalsListUl.addEventListener('click', (e) => { const userId = auth.currentUser.uid; if (!userId) return; if (e.target.classList.contains('delete-prof-btn')) { if (confirm("Tem certeza?")) db.collection('negocios').doc(userId).collection('profissionais').doc(e.target.dataset.id).delete(); } if (e.target.classList.contains('edit-prof-btn')) { const professionalId = e.target.dataset.id; db.collection('negocios').doc(userId).collection('profissionais').doc(professionalId).get().then(doc => { if (doc.exists) { const prof = doc.data(); professionalNameInput.value = prof.nome; renderServicesChecklist(prof.servicosOferecidos || {}); diasDaSemana.forEach(dia => { document.getElementById(`${dia}-inicio`).value = prof.horariosTrabalho[dia]?.inicio || ''; document.getElementById(`${dia}-fim`).value = prof.horariosTrabalho[dia]?.fim || ''; }); profEditMode = true; profIdToEdit = professionalId; profFormSubmitButton.textContent = 'Atualizar Profissional'; addProfessionalForm.scrollIntoView({ behavior: 'smooth' }); } }); } });
function resetProfessionalForm() { addProfessionalForm.reset(); profEditMode = false; profIdToEdit = null; profFormSubmitButton.textContent = 'Salvar Profissional'; renderServicesChecklist(); }

// ====================================================
// --- AGENDA E CALENDÁRIO ---
// ====================================================
function initializeCalendar(userId) {
    const calendarEl = document.getElementById('calendar');
    const appointmentModalEl = document.getElementById('appointmentDetailsModal');
    if (!calendarEl || !appointmentModalEl) { console.error("Elemento do Calendário ou do Modal não encontrado!"); return; }
    appointmentModal = new bootstrap.Modal(appointmentModalEl);

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        locale: 'pt-br',
        buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' },
        
        events: function(fetchInfo, successCallback, failureCallback) {
            db.collection('negocios').doc(userId).collection('agendamentos').onSnapshot(snapshot => {
                const events = snapshot.docs.map(doc => {
                    const agendamento = doc.data();
                    // Define a cor baseada no status
                    let color = '#198754'; // Verde para 'confirmado'
                    if (agendamento.status === 'cancelado') color = '#dc3545'; // Vermelho para 'cancelado'
                    if (agendamento.status === 'pendente') color = '#ffc107'; // Amarelo para 'pendente'

                    return {
                        id: doc.id,
                        title: agendamento.nomeCliente,
                        start: agendamento.dataHoraInicio,
                        end: agendamento.dataHoraFim,
                        color: color
                    };
                });
                successCallback(events);
            }, error => failureCallback(error));
        },
        
        eventClick: async function(info) {
            info.jsEvent.preventDefault();
            const agendamentoId = info.event.id;
            try {
                const agendamentoRef = await db.collection('negocios').doc(userId).collection('agendamentos').doc(agendamentoId).get();
                if (!agendamentoRef.exists) { alert("Agendamento não encontrado!"); return; }
                const agendamento = agendamentoRef.data();

                const servicoRef = await db.collection('negocios').doc(userId).collection('servicos').doc(agendamento.servicoId).get();
                const profissionalRef = await db.collection('negocios').doc(userId).collection('profissionais').doc(agendamento.profissionalId).get();

                // Preenche os dados básicos
                document.getElementById('modal-client-name').textContent = agendamento.nomeCliente;
                document.getElementById('modal-service-name').textContent = servicoRef.exists ? servicoRef.data().nome : "Serviço não encontrado";
                document.getElementById('modal-professional-name').textContent = profissionalRef.exists ? profissionalRef.data().nome : "Profissional não encontrado";
                document.getElementById('modal-date').textContent = new Date(agendamento.dataHoraInicio).toLocaleDateString('pt-BR');
                document.getElementById('modal-time').textContent = new Date(agendamento.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                // LÓGICA DE VISIBILIDADE BASEADA NO STATUS
                const statusBadge = document.getElementById('modal-status');
                const cancelBtn = document.getElementById('cancel-appointment-btn');
                const confirmBtn = document.getElementById('confirm-appointment-btn');
                const reasonInputGroup = document.getElementById('cancel-reason-input-group');
                const reasonDisplayGroup = document.getElementById('cancel-reason-display-group');
                const reasonDisplayText = document.getElementById('cancel-reason-display');

                let statusColorClass = 'bg-success';
                if (agendamento.status === 'cancelado') statusColorClass = 'bg-danger';
                if (agendamento.status === 'pendente') statusColorClass = 'bg-warning';
                statusBadge.textContent = agendamento.status;
                statusBadge.className = `badge ${statusColorClass}`;

                if (agendamento.status === 'cancelado') {
                    // MODO DE LEITURA (CANCELADO)
                    cancelBtn.style.display = 'none';
                    confirmBtn.style.display = 'none';
                    reasonInputGroup.style.display = 'none';
                    reasonDisplayGroup.style.display = 'block';
                    reasonDisplayText.textContent = agendamento.motivoCancelamento || "Nenhum motivo informado.";
                } else {
                    // MODO DE AÇÃO (PENDENTE OU CONFIRMADO)
                    reasonInputGroup.style.display = 'block';
                    reasonDisplayGroup.style.display = 'none';
                    document.getElementById('cancel-reason').value = '';
                    
                    // Mostra/esconde botões conforme o status
                    cancelBtn.style.display = 'inline-block';
                    confirmBtn.style.display = agendamento.status === 'pendente' ? 'inline-block' : 'none';
                }
                
                appointmentModal.show();
                
                // --- LÓGICA DOS BOTÕES ---
                cancelBtn.onclick = async () => {
                    const motivo = document.getElementById('cancel-reason').value;
                    if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
                        await db.collection('negocios').doc(userId).collection('agendamentos').doc(agendamentoId).update({
                            status: 'cancelado',
                            motivoCancelamento: motivo || ""
                        });
                        appointmentModal.hide();
                    }
                };

                confirmBtn.onclick = async () => {
                    if (confirm("Confirmar este agendamento?")) {
                        await db.collection('negocios').doc(userId).collection('agendamentos').doc(agendamentoId).update({
                            status: 'confirmado'
                        });
                        appointmentModal.hide();
                        // (Futuramente, a notificação de confirmação seria enviada aqui)
                    }
                };

            } catch (error) {
                console.error("Erro ao buscar detalhes do agendamento:", error);
                alert("Não foi possível carregar os detalhes do agendamento.");
            }
        },
    });
    calendar.render();
}