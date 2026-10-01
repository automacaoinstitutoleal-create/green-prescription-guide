# Registro técnico de falhas

Criar um histórico centralizado de erros para identificar rapidamente em qual tela e etapa cada médico encontrou uma falha, sem guardar conteúdo clínico ou senhas.

## Implementação

- Criar uma tabela protegida de registros técnicos, vinculada ao médico autenticado.
- Registrar data automática, tela, operação, etapa, tipo e mensagem do erro, navegador e endereço da página.
- Não registrar nomes, CPF, textos de anamnese, senhas, tokens ou outros dados clínicos sensíveis.
- Criar uma função única de registro que nunca interrompa o uso do sistema caso o próprio registro falhe.
- Integrar o registro nas operações principais: login/recuperação, lista de pacientes, cadastro/edição/exclusão, perfil, carregamento da prescrição, salvamento da receita, geração de PDFs e histórico.
- Capturar também falhas inesperadas da tela, mantendo a mensagem amigável atual.
- Validar o fluxo autenticado e confirmar que o registro aparece com data, etapa e contexto técnico.

## Segurança e acesso

- Cada médico poderá criar registros associados apenas à própria conta.
- Os médicos não verão registros de outros usuários.
- O conteúdo será técnico e sanitizado, sem payloads médicos ou credenciais.
