🔄 Integração Octadesk ↔ Omie (Python)

Este projeto realiza a sincronização de contatos entre a plataforma de atendimento **Octadesk** e o sistema ERP **Omie**, garantindo que os dados dos clientes estejam sempre atualizados entre os dois sistemas.


📚 Tecnologias utilizadas

- **Python 3**
- **Requests** – para requisições HTTP
- **Regex (re)** – para sanitização e validação de CPF/CNPJ

⚙️ Como funciona

1. A aplicação busca todos os contatos cadastrados no Octadesk.
2. Para cada contato:
   - Verifica se possui CPF ou CNPJ nos `customFields`.
   - Valida o formato do CPF/CNPJ.
   - Consulta o cliente no Omie usando o `codigo_cliente_integracao`.
   - Se o cliente existir:
     - Compara os dados de razão social e e-mail.
     - Atualiza no Omie, caso haja diferença.
   - Se não existir:
     - Apenas loga a ausência (não cria cliente novo, por enquanto).

🚀 Como executar

1. Instale as dependências

```bash
pip install requests
```

2. Configure as credenciais da API

Abra o arquivo `server.py` e preencha com suas chaves:

```python
# API do Octadesk
OCTADESK_API_URL = "https://sua-url-da-api-octadesk"
OCTADESK_API_KEY = "sua-api-key"

# API do Omie
OMIE_API_URL = "https://app.omie.com.br/api/v1/geral/clientes/"
OMIE_APP_KEY = "sua-app-key"
OMIE_APP_SECRET = "seu-app-secret"
```

3. Execute o script

```bash
python server.py
```

✅ Requisitos para sincronização

- O contato no Octadesk deve conter **CPF ou CNPJ** no campo personalizado (`customFields`).
- O CPF/CNPJ deve conter apenas números e ter:
  - **11 dígitos** para CPF
  - **14 dígitos** para CNPJ
