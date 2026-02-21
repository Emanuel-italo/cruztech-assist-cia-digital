

# Cruztech Assistência - Relatório de Visita Técnica

## Visão Geral
Aplicativo web responsivo (mobile-first) para técnicos de manutenção da Cruztech preencherem Relatórios de Visita Técnica e Preventiva (PMOC), com geração de PDF profissional, autenticação e histórico de relatórios.

**Identidade Visual:** Azul marinho (#0a1f44), branco e cinza claro. Logo Cruztech no topo do app e no PDF.

---

## Funcionalidades

### 1. Autenticação (Lovable Cloud / Supabase)
- Tela de login com e-mail e senha
- Acesso restrito apenas para técnicos cadastrados
- Perfil simples do técnico (nome, e-mail)

### 2. Tela Inicial - Lista de Relatórios
- Lista dos relatórios já preenchidos pelo técnico com data, cliente e status
- Botão para criar novo relatório
- Opção de reabrir/visualizar relatórios anteriores e baixar o PDF novamente

### 3. Formulário do Relatório (Cards Expansíveis)
Formulário dividido em seções com cards expansíveis para facilitar o preenchimento no celular:

**Seção A - Dados do Cliente:** Nome/Razão Social, CNPJ, E-mail, Endereço, Informações adicionais

**Seção B - Informações da Visita:** Tipo de serviço (Instalação/Preventiva/Corretiva), Km do veículo, Data/Hora (auto-preenchida, editável), Botão de captura GPS

**Seção C - Lista de Equipamentos:** Formulário dinâmico com botão "Adicionar Equipamento" (Nome, Marca, Modelo, Nº Série, Informações)

**Seção D - Checklist PMOC:** Mês de referência, Período, itens de Filtros de Ar e Gabinetes com radio buttons (Conforme/Não Conforme/Não se aplica)

**Seção E - Detalhamento:** Problema Identificado/Relato do Cliente, Serviço Realizado (textareas)

**Seção F - Fotos:** Captura via câmera do celular ou galeria, até 4 fotos com miniaturas visíveis

**Seção G - Aprovação:** Canvas para assinatura digital do cliente com o dedo na tela

### 4. Geração de PDF Profissional
- Layout com logo Cruztech no topo, blocos coloridos (azul marinho/cinza) separando seções
- Design semelhante ao modelo de referência fornecido (laudo técnico)
- Inclui fotos do serviço e assinatura digital
- Opções: baixar PDF ou compartilhar via WhatsApp/E-mail

### 5. Backend e Armazenamento (Lovable Cloud)
- Banco de dados para salvar relatórios, equipamentos, fotos e assinaturas
- Storage para fotos e PDFs gerados
- Autenticação com Supabase Auth
- Histórico completo de relatórios por técnico

---

## Etapas de Implementação

1. **Setup visual e logo** - Tema azul marinho, inserir logo Cruztech
2. **Autenticação** - Login/logout com Supabase Auth
3. **Banco de dados** - Tabelas para relatórios, equipamentos, checklist
4. **Formulário completo** - Todas as seções (A-G) com cards expansíveis
5. **Captura de fotos e assinatura** - Câmera, galeria e canvas de assinatura
6. **Geração de PDF** - Layout profissional com todos os dados
7. **Lista de relatórios** - Histórico com busca e download
8. **Compartilhamento** - Download e share via WhatsApp/E-mail

