// Inicializa o Firebase - Esta linha você já tinha
firebase.initializeApp(firebaseConfig);

console.log("Firebase conectado!");

// --- INÍCIO DO CÓDIGO DE LOGIN ---

// 1. Pega as referências dos elementos do HTML
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

// 2. Adiciona um "escutador" para o evento de submit do formulário
loginForm.addEventListener('submit', (event) => {
    // Previne o comportamento padrão do formulário, que é recarregar a página
    event.preventDefault();

    // 3. Pega os valores digitados pelo usuário
    const email = emailInput.value;
    const password = passwordInput.value;

    console.log(`Tentando fazer login com o email: ${email}`);

    // 4. Usa a função de login do Firebase Authentication
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login bem-sucedido!
            const user = userCredential.user;
            console.log("Usuário autenticado com sucesso:", user);
            window.location.href = 'dashboard.html';

            // Futuramente, aqui vamos redirecionar o usuário para o painel principal
            // window.location.href = '/dashboard.html';
        })
        .catch((error) => {
            // Ocorreu um erro no login
            console.error("Erro na autenticação:", error);

            let mensagemDeErro = "Ocorreu um erro ao tentar fazer o login. Tente novamente.";
            
            // Personaliza a mensagem de erro para o usuário
            if (error.code === 'auth/user-not-found') {
                mensagemDeErro = "Nenhum usuário encontrado com este e-mail.";
            } else if (error.code === 'auth/wrong-password') {
                mensagemDeErro = "Senha incorreta. Por favor, tente novamente.";
            } else if (error.code === 'auth/invalid-email') {
                mensagemDeErro = "O formato do e-mail é inválido.";
            }

            alert(mensagemDeErro);
        });
});