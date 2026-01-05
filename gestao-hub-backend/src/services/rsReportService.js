const { supabase } = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

class RsReportService {
    // Helper para adicionar cabeçalho com logo
    addPdfHeader(doc, title, subtitle = null) {
        const logoPath = path.join(__dirname, '../../public/logoNaue.png');

        // Adicionar logo se existir
        if (fs.existsSync(logoPath)) {
            try {
                doc.image(logoPath, 50, 40, { width: 80 });
            } catch (error) {
                console.warn('Erro ao carregar logo:', error.message);
            }
        }

        // Título ao lado do logo
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#003b2b')
           .text(title, 140, 50, { align: 'left' });

        // Subtítulo se fornecido
        if (subtitle) {
            doc.fontSize(12)
               .font('Helvetica')
               .fillColor('#333333')
               .text(subtitle, 140, 75, { align: 'left' });
        }

        // Data de geração
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#666666')
           .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 50, 100, { align: 'right' });

        doc.moveDown(3);
        doc.fillColor('#333333'); // Reset cor padrão para o texto
    }

    // Helper para buscar vagas com filtros
    async fetchVagas(filters = {}) {
        let query = supabase
            .from('vagas')
            .select(`
                *,
                client:clients(
                    *,
                    clients_pj!clients_pj_client_id_fkey(*),
                    clients_pf!clients_pf_client_id_fkey(*)
                ),
                user:users!user_id(id, name),
                candidato_aprovado:candidatos(id, nome)
            `)
            .order('data_abertura', { ascending: false });

        if (filters.clientId) {
            query = query.eq('client_id', filters.clientId);
        }

        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Erro ao buscar vagas: ${error.message}`);
        }

        let result = data || [];

        // Filtrar por data manualmente para evitar problemas de timezone
        if (filters.startDate || filters.endDate) {
            // Para relatórios gerais e com filtro de data, filtrar por data de fechamento
            // Para relatórios de consultora, também usar data de fechamento
            const dateField = 'data_fechamento_cancelamento';

            result = result.filter(vaga => {
                const vagaDate = vaga[dateField];

                // Se não há data de fechamento, não incluir no filtro por período
                if (!vagaDate) return false;

                // Extrair apenas a parte da data (YYYY-MM-DD) sem considerar timezone
                const vagaDateOnly = vagaDate.split('T')[0];

                let matches = true;

                if (filters.startDate) {
                    matches = matches && vagaDateOnly >= filters.startDate;
                }

                if (filters.endDate) {
                    matches = matches && vagaDateOnly <= filters.endDate;
                }

                return matches;
            });
        }

        return result;
    }

    // Helper para calcular métricas
    calculateMetrics(vagas) {
        const total = vagas.length;
        const abertas = vagas.filter(v => v.status === 'aberta').length;
        const fechadas = vagas.filter(v => v.status === 'fechada' || v.status === 'fechada_rep').length;
        const canceladas = vagas.filter(v => v.status === 'cancelada_cliente').length;
        const taxaFechamento = total > 0 ? ((fechadas / total) * 100).toFixed(1) : 0;

        // Calcular totais financeiros - CONSIDERANDO TODAS AS VAGAS
        let faturamentoTotal = 0;
        let impostoTotal = 0;
        let valorLiquidoTotal = 0;

        vagas.forEach((v) => {
            const valorFaturamento = parseFloat(v.valor_faturamento) || 0;
            const impostoEstado = parseFloat(v.imposto_estado) || 0;
            const valorImposto = valorFaturamento * (impostoEstado / 100);
            const valorLiquido = valorFaturamento - valorImposto;

            faturamentoTotal += valorFaturamento;
            impostoTotal += valorImposto;
            valorLiquidoTotal += valorLiquido;
        });

        return {
            total,
            abertas,
            fechadas,
            canceladas,
            taxaFechamento,
            faturamentoTotal,
            impostoTotal,
            valorLiquidoTotal
        };
    }

    // Mapear labels de status
    getStatusLabel(status) {
        const labels = {
            'aberta': 'Aberta',
            'divulgacao_prospec': 'Divulgação/Prospecção',
            'entrevista_nc': 'Entrevista NC',
            'entrevista_empresa': 'Entrevista Empresa',
            'testes': 'Testes',
            'fechada': 'Fechada',
            'fechada_rep': 'Fechada/Reposição',
            'cancelada_cliente': 'Cancelada',
            'standby': 'Standby',
            'nao_cobrada': 'Não Cobrada',
            'encerramento_cont': 'Encerramento'
        };
        return labels[status] || status;
    }

    // Helper para calcular comissão da consultora
    // Comissão = 5% sobre o valor líquido (lucro = faturamento - imposto)
    getComissaoConsultora(vaga, userId) {
        const valorFaturamento = parseFloat(vaga.valor_faturamento) || 0;
        const impostoEstado = parseFloat(vaga.imposto_estado) || 0;
        const valorImposto = valorFaturamento * (impostoEstado / 100);
        const valorLucro = valorFaturamento - valorImposto;
        const percentualComissao = 5; // 5% sobre o lucro
        const valorComissao = valorLucro * (percentualComissao / 100);

        return {
            user_id: userId,
            percentual_comissao: percentualComissao,
            valor_faturamento: valorFaturamento,
            valor_imposto: valorImposto,
            valor_lucro: valorLucro,
            valor_comissao: valorComissao
        };
    }

    // Mapear labels de tipo de cargo
    getTipoCargoLabel(tipo) {
        const labels = {
            'administrativo': 'Administrativo',
            'comercial': 'Comercial',
            'estagio': 'Estágio',
            'gestao': 'Gestão',
            'operacional': 'Operacional',
            'jovem_aprendiz': 'Jovem Aprendiz'
        };
        return labels[tipo] || tipo;
    }

    // Mapear labels de status do candidato
    getCandidatoStatusLabel(status) {
        const labels = {
            'pendente': 'Pendente',
            'aprovado': 'Aprovado',
            'reprovado': 'Reprovado'
        };
        return labels[status] || status;
    }

    // Helper para formatar data sem timezone
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        // Extrair apenas YYYY-MM-DD e formatar manualmente para evitar conversão de timezone
        const dateOnly = dateString.split('T')[0];
        const [year, month, day] = dateOnly.split('-');
        return `${day}/${month}/${year}`;
    }

    // Helper para obter nome do cliente
    getClientName(client) {
        if (!client) return 'N/A';

        // Tentar obter de clients_pj
        if (client.clients_pj && client.clients_pj.company_name) {
            return client.clients_pj.company_name;
        }

        // Tentar obter de clients_pf
        if (client.clients_pf && client.clients_pf.full_name) {
            return client.clients_pf.full_name;
        }

        // Fallback para campos diretos (caso exista)
        return client.company_name || client.full_name || 'N/A';
    }

    // ============= RELATÓRIO GERAL R&S =============
    async generateRsGeneralReportPDF(startDate, endDate) {
        const vagas = await this.fetchVagas({ startDate, endDate });
        const metrics = this.calculateMetrics(vagas);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {});

        // Header com logo
        this.addPdfHeader(doc, 'Relatório Geral R&S');

        // Métricas principais em caixas
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Resumo Geral');
        doc.moveDown(1);

        // Caixa de métricas
        const boxY = doc.y;
        doc.roundedRect(50, boxY, doc.page.width - 100, 130, 5)
           .lineWidth(1)
           .strokeColor('#003b2b')
           .fillAndStroke('#f9f9f9', '#003b2b');

        doc.fillColor('#333333');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Total de Vagas: ${metrics.total}`, 70, boxY + 15);
        doc.text(`Vagas Abertas: ${metrics.abertas}`, 70, boxY + 35);
        doc.text(`Vagas Fechadas: ${metrics.fechadas}`, 70, boxY + 55);
        doc.text(`Vagas Canceladas: ${metrics.canceladas}`, 70, boxY + 75);
        doc.text(`Taxa de Fechamento: ${metrics.taxaFechamento}%`, 70, boxY + 95);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#007a33');
        doc.text(`Valor Líquido Total: R$ ${metrics.valorLiquidoTotal.toFixed(2).replace('.', ',')}`, 70, boxY + 115);

        doc.y = boxY + 145;
        doc.moveDown(1);

        // Listagem de vagas
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Detalhamento das Vagas');
        doc.moveDown(1);

        vagas.forEach((vaga, index) => {
            // Adicionar nova página se necessário
            if (doc.y > 700) {
                doc.addPage();
            }

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#003b2b').text(`${index + 1}. ${vaga.cargo}`);
            doc.fontSize(9).font('Helvetica').fillColor('#333333');
            doc.text(`   Cliente: ${this.getClientName(vaga.client)}`);
            doc.text(`   Consultora: ${vaga.user?.name || 'N/A'}`);
            doc.text(`   Status: ${this.getStatusLabel(vaga.status)}`);
            doc.text(`   Tipo: ${this.getTipoCargoLabel(vaga.tipo_cargo)}`);
            doc.text(`   Data Abertura: ${this.formatDate(vaga.data_abertura)}`);
            doc.text(`   Data Fechamento: ${vaga.data_fechamento_cancelamento ? this.formatDate(vaga.data_fechamento_cancelamento) : '-'}`);
            doc.text(`   Salário: R$ ${vaga.salario?.toFixed(2).replace('.', ',') || '0,00'}`);
            doc.text(`   % Faturamento: ${vaga.porcentagem_faturamento || 100}%`);
            doc.text(`   Valor Faturamento: R$ ${(vaga.valor_faturamento || 0).toFixed(2).replace('.', ',')}`);
            doc.text(`   Imposto Estado: ${vaga.imposto_estado || 0}%`);

            // Calcular valor líquido (faturamento - imposto)
            const valorFaturamento = vaga.valor_faturamento || 0;
            const impostoEstado = vaga.imposto_estado || 0;
            const valorImposto = valorFaturamento * (impostoEstado / 100);
            const valorLiquido = valorFaturamento - valorImposto;

            doc.text(`   Valor Imposto: R$ ${valorImposto.toFixed(2).replace('.', ',')}`);
            doc.text(`   Valor Líquido: R$ ${valorLiquido.toFixed(2).replace('.', ',')}`);
            doc.moveDown(0.5);
        });

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
        });
    }

    async generateRsGeneralReportExcel(startDate, endDate) {
        const vagas = await this.fetchVagas({ startDate, endDate });
        const metrics = this.calculateMetrics(vagas);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Relatório Geral R&S');

        // Header
        sheet.mergeCells('A1:N1');
        sheet.getCell('A1').value = 'RELATÓRIO GERAL R&S';
        sheet.getCell('A1').font = { size: 16, bold: true };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:N2');
        sheet.getCell('A2').value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`;
        sheet.getCell('A2').alignment = { horizontal: 'center' };

        // Métricas
        sheet.addRow([]);
        sheet.addRow(['RESUMO GERAL']);
        sheet.getCell('A4').font = { bold: true };
        sheet.addRow(['Total de Vagas:', metrics.total]);
        sheet.addRow(['Vagas Abertas:', metrics.abertas]);
        sheet.addRow(['Vagas Fechadas:', metrics.fechadas]);
        sheet.addRow(['Vagas Canceladas:', metrics.canceladas]);
        sheet.addRow(['Taxa de Fechamento:', `${metrics.taxaFechamento}%`]);

        const valorLiquidoRow = sheet.addRow(['Valor Líquido Total:', metrics.valorLiquidoTotal]);
        valorLiquidoRow.getCell(2).numFmt = 'R$ #,##0.00';
        valorLiquidoRow.font = { bold: true, color: { argb: 'FF007A33' } };

        // Tabela de vagas
        sheet.addRow([]);
        const detalhamentoRow = sheet.addRow(['DETALHAMENTO DAS VAGAS']);
        detalhamentoRow.getCell(1).font = { bold: true };
        sheet.addRow([]);

        const headerRow = sheet.addRow(['Código', 'Cargo', 'Cliente', 'Consultora', 'Status', 'Tipo', 'Data Abertura', 'Data Fechamento', 'Salário', '% Faturamento', 'Valor Faturamento', 'Imposto Estado', 'Valor Imposto', 'Valor Líquido']);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

        vagas.forEach(vaga => {
            const valorFaturamento = vaga.valor_faturamento || 0;
            const impostoEstado = vaga.imposto_estado || 0;
            const valorImposto = valorFaturamento * (impostoEstado / 100);
            const valorLiquido = valorFaturamento - valorImposto;

            const row = sheet.addRow([
                vaga.codigo,
                vaga.cargo,
                this.getClientName(vaga.client),
                vaga.user?.name || 'N/A',
                this.getStatusLabel(vaga.status),
                this.getTipoCargoLabel(vaga.tipo_cargo),
                this.formatDate(vaga.data_abertura),
                vaga.data_fechamento_cancelamento ? this.formatDate(vaga.data_fechamento_cancelamento) : '-',
                vaga.salario || 0,
                (vaga.porcentagem_faturamento || 100) / 100,
                valorFaturamento,
                impostoEstado / 100,
                valorImposto,
                valorLiquido
            ]);

            // Aplicar formato brasileiro de moeda (R$) nas colunas de valor
            row.getCell(9).numFmt = 'R$ #,##0.00';   // Salário
            row.getCell(10).numFmt = '0.00%';         // % Faturamento
            row.getCell(11).numFmt = 'R$ #,##0.00';  // Valor Faturamento
            row.getCell(12).numFmt = '0.00%';         // Imposto Estado
            row.getCell(13).numFmt = 'R$ #,##0.00';  // Valor Imposto
            row.getCell(14).numFmt = 'R$ #,##0.00';  // Valor Líquido
        });

        // Ajustar largura das colunas
        sheet.columns = [
            { width: 12 },  // Código
            { width: 30 },  // Cargo
            { width: 30 },  // Cliente
            { width: 25 },  // Consultora
            { width: 20 },  // Status
            { width: 15 },  // Tipo
            { width: 15 },  // Data Abertura
            { width: 15 },  // Data Fechamento
            { width: 15 },  // Salário
            { width: 15 },  // % Faturamento
            { width: 18 },  // Valor Faturamento
            { width: 15 },  // Imposto Estado
            { width: 15 },  // Valor Imposto
            { width: 15 }   // Valor Líquido
        ];

        return await workbook.xlsx.writeBuffer();
    }

    // ============= RELATÓRIO POR CLIENTE =============
    async generateRsClientReportPDF(clientId, startDate, endDate) {
        const vagas = await this.fetchVagas({ clientId, startDate, endDate });
        const metrics = this.calculateMetrics(vagas);

        // Buscar dados do cliente
        const { data: client } = await supabase
            .from('clients')
            .select(`
                *,
                clients_pj!clients_pj_client_id_fkey(*),
                clients_pf!clients_pf_client_id_fkey(*)
            `)
            .eq('id', clientId)
            .single();

        const clientName = client?.clients_pj?.company_name || client?.clients_pf?.full_name || 'Cliente não encontrado';

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));

        // Header com logo
        this.addPdfHeader(doc, 'Relatório R&S por Cliente', `Cliente: ${clientName}`);

        // Métricas em caixa
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Resumo');
        doc.moveDown(1);

        const boxY = doc.y;
        doc.roundedRect(50, boxY, doc.page.width - 100, 95, 5)
           .lineWidth(1)
           .strokeColor('#003b2b')
           .fillAndStroke('#f9f9f9', '#003b2b');

        doc.fillColor('#333333');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Total de Vagas: ${metrics.total}`, 70, boxY + 15);
        doc.text(`Vagas Fechadas: ${metrics.fechadas}`, 70, boxY + 35);
        doc.text(`Taxa de Fechamento: ${metrics.taxaFechamento}%`, 70, boxY + 55);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#003b2b');
        doc.text(`Faturamento Total: R$ ${metrics.faturamentoTotal.toFixed(2).replace('.', ',')}`, 70, boxY + 75);

        doc.y = boxY + 110;
        doc.moveDown(1);

        // Listagem
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Vagas do Cliente');
        doc.moveDown(1);

        vagas.forEach((vaga, index) => {
            // Adicionar nova página se necessário
            if (doc.y > 700) {
                doc.addPage();
            }

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#003b2b').text(`${index + 1}. ${vaga.cargo}`);
            doc.fontSize(9).font('Helvetica').fillColor('#333333');
            doc.text(`   Status: ${this.getStatusLabel(vaga.status)}`);
            doc.text(`   Consultora: ${vaga.user?.name || 'N/A'}`);
            doc.text(`   Salário: R$ ${vaga.salario?.toFixed(2).replace('.', ',') || '0,00'}`);
            doc.text(`   Data Abertura: ${this.formatDate(vaga.data_abertura)}`);
            doc.text(`   Data Fechamento: ${vaga.data_fechamento_cancelamento ? this.formatDate(vaga.data_fechamento_cancelamento) : '-'}`);
            doc.moveDown(0.5);
        });

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
        });
    }

    async generateRsClientReportExcel(clientId, startDate, endDate) {
        const vagas = await this.fetchVagas({ clientId, startDate, endDate });
        const metrics = this.calculateMetrics(vagas);

        const { data: client } = await supabase
            .from('clients')
            .select(`
                *,
                clients_pj!clients_pj_client_id_fkey(*),
                clients_pf!clients_pf_client_id_fkey(*)
            `)
            .eq('id', clientId)
            .single();

        const clientName = client?.clients_pj?.company_name || client?.clients_pf?.full_name || 'Cliente não encontrado';

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Relatório Cliente R&S');

        // Header
        sheet.mergeCells('A1:F1');
        sheet.getCell('A1').value = 'RELATÓRIO R&S POR CLIENTE';
        sheet.getCell('A1').font = { size: 16, bold: true };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:F2');
        sheet.getCell('A2').value = `Cliente: ${clientName}`;
        sheet.getCell('A2').font = { size: 12 };
        sheet.getCell('A2').alignment = { horizontal: 'center' };

        // Métricas
        sheet.addRow([]);
        sheet.addRow(['Total de Vagas:', metrics.total]);
        sheet.addRow(['Vagas Fechadas:', metrics.fechadas]);
        sheet.addRow(['Taxa de Fechamento:', `${metrics.taxaFechamento}%`]);

        const faturamentoClientRow = sheet.addRow(['Faturamento Total:', metrics.faturamentoTotal]);
        faturamentoClientRow.getCell(2).numFmt = 'R$ #,##0.00';

        // Tabela
        sheet.addRow([]);
        const headerRow = sheet.addRow(['Código', 'Cargo', 'Status', 'Consultora', 'Salário', 'Data Abertura']);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

        vagas.forEach(vaga => {
            const row = sheet.addRow([
                vaga.codigo,
                vaga.cargo,
                this.getStatusLabel(vaga.status),
                vaga.user?.name || 'N/A',
                vaga.salario || 0,
                this.formatDate(vaga.data_abertura)
            ]);

            // Aplicar formato brasileiro de moeda
            row.getCell(5).numFmt = 'R$ #,##0.00';
        });

        sheet.columns = [
            { width: 12 },
            { width: 30 },
            { width: 20 },
            { width: 25 },
            { width: 15 },
            { width: 15 }
        ];

        return await workbook.xlsx.writeBuffer();
    }

    // ============= RELATÓRIO POR CONSULTORA =============
    async generateRsConsultoraReportPDF(userId, startDate, endDate) {
        const vagas = await this.fetchVagas({ userId, startDate, endDate });
        const metrics = this.calculateMetrics(vagas);

        // Buscar dados da consultora
        const { data: user } = await supabase
            .from('users')
            .select('name')
            .eq('id', userId)
            .single();

        const userName = user?.name || 'Consultora não encontrada';

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));

        // Header com logo
        this.addPdfHeader(doc, 'Relatório R&S por Consultora', `Consultora: ${userName}`);

        // Calcular total de comissões (apenas vagas fechadas)
        let totalComissoes = 0;
        vagas.forEach(vaga => {
            // Só somar comissões de vagas fechadas
            if (vaga.status === 'fechada' || vaga.status === 'fechada_rep') {
                const comissao = this.getComissaoConsultora(vaga, userId);
                if (comissao && comissao.valor_comissao) {
                    totalComissoes += parseFloat(comissao.valor_comissao);
                }
            }
        });

        // Métricas em caixa
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Performance');
        doc.moveDown(1);

        const boxY = doc.y;
        doc.roundedRect(50, boxY, doc.page.width - 100, 115, 5)
           .lineWidth(1)
           .strokeColor('#003b2b')
           .fillAndStroke('#f9f9f9', '#003b2b');

        doc.fillColor('#333333');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Total de Vagas: ${metrics.total}`, 70, boxY + 15);
        doc.text(`Vagas Fechadas: ${metrics.fechadas}`, 70, boxY + 35);
        doc.text(`Taxa de Fechamento: ${metrics.taxaFechamento}%`, 70, boxY + 55);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#003b2b');
        doc.text(`Faturamento Gerado: R$ ${metrics.faturamentoTotal.toFixed(2).replace('.', ',')}`, 70, boxY + 75);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#007a33');
        doc.text(`Total de Comissões: R$ ${totalComissoes.toFixed(2).replace('.', ',')}`, 70, boxY + 95);

        doc.y = boxY + 130;
        doc.moveDown(1);

        // Listagem
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Vagas da Consultora');
        doc.moveDown(1);

        vagas.forEach((vaga, index) => {
            // Adicionar nova página se necessário
            if (doc.y > 700) {
                doc.addPage();
            }

            const comissao = this.getComissaoConsultora(vaga, userId);
            const valorComissao = comissao?.valor_comissao || 0;
            const percentualComissao = comissao?.percentual_comissao || 0;
            const valorFaturamento = comissao?.valor_faturamento || 0;
            const valorImposto = comissao?.valor_imposto || 0;
            const impostoEstado = vaga.imposto_estado || 0;
            const valorLucro = comissao?.valor_lucro || 0;

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#003b2b').text(`${index + 1}. ${vaga.cargo}`);
            doc.fontSize(9).font('Helvetica').fillColor('#333333');
            doc.text(`   Cliente: ${this.getClientName(vaga.client)}`);
            doc.text(`   Status: ${this.getStatusLabel(vaga.status)}`);
            doc.text(`   Data Abertura: ${this.formatDate(vaga.data_abertura)}`);
            doc.text(`   Data Fechamento: ${vaga.data_fechamento_cancelamento ? this.formatDate(vaga.data_fechamento_cancelamento) : '-'}`);
            doc.text(`   Salário: R$ ${vaga.salario?.toFixed(2).replace('.', ',') || '0,00'}`);
            doc.text(`   Valor Faturamento: R$ ${valorFaturamento.toFixed(2).replace('.', ',')}`);
            doc.text(`   Imposto Estado: ${impostoEstado}%`);
            doc.text(`   Valor Imposto: R$ ${valorImposto.toFixed(2).replace('.', ',')}`);
            doc.text(`   Valor Lucro: R$ ${valorLucro.toFixed(2).replace('.', ',')}`);
            doc.text(`   % Comissão: ${percentualComissao}%`);
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#007a33');
            doc.text(`   Valor Comissão: R$ ${parseFloat(valorComissao).toFixed(2).replace('.', ',')}`, 70, doc.y);
            doc.fillColor('#333333').font('Helvetica');
            doc.moveDown(0.5);
        });

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
        });
    }

    async generateRsConsultoraReportExcel(userId, startDate, endDate) {
        const vagas = await this.fetchVagas({ userId, startDate, endDate });
        const metrics = this.calculateMetrics(vagas);

        const { data: user } = await supabase
            .from('users')
            .select('name')
            .eq('id', userId)
            .single();

        const userName = user?.name || 'Consultora não encontrada';

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Relatório Consultora R&S');

        // Calcular total de comissões (apenas vagas fechadas)
        let totalComissoes = 0;
        vagas.forEach(vaga => {
            // Só somar comissões de vagas fechadas
            if (vaga.status === 'fechada' || vaga.status === 'fechada_rep') {
                const comissao = this.getComissaoConsultora(vaga, userId);
                if (comissao && comissao.valor_comissao) {
                    totalComissoes += parseFloat(comissao.valor_comissao);
                }
            }
        });

        // Header
        sheet.mergeCells('A1:M1');
        sheet.getCell('A1').value = 'RELATÓRIO R&S POR CONSULTORA';
        sheet.getCell('A1').font = { size: 16, bold: true };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:M2');
        sheet.getCell('A2').value = `Consultora: ${userName}`;
        sheet.getCell('A2').font = { size: 12 };
        sheet.getCell('A2').alignment = { horizontal: 'center' };

        // Métricas
        sheet.addRow([]);
        sheet.addRow(['Total de Vagas:', metrics.total]);
        sheet.addRow(['Vagas Fechadas:', metrics.fechadas]);
        sheet.addRow(['Taxa de Fechamento:', `${metrics.taxaFechamento}%`]);

        const faturamentoConsultoraRow = sheet.addRow(['Faturamento Gerado:', metrics.faturamentoTotal]);
        faturamentoConsultoraRow.getCell(2).numFmt = 'R$ #,##0.00';

        const totalComissoesRow = sheet.addRow(['Total de Comissões:', totalComissoes]);
        totalComissoesRow.getCell(2).numFmt = 'R$ #,##0.00';
        totalComissoesRow.font = { bold: true, color: { argb: 'FF007A33' } };

        // Tabela
        sheet.addRow([]);
        const headerRow = sheet.addRow(['Código', 'Cargo', 'Cliente', 'Status', 'Data Abertura', 'Data Fechamento', 'Salário', 'Valor Faturamento', 'Imposto %', 'Valor Imposto', 'Valor Lucro', '% Comissão', 'Valor Comissão']);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

        vagas.forEach(vaga => {
            const comissao = this.getComissaoConsultora(vaga, userId);
            const valorComissao = comissao?.valor_comissao || 0;
            const percentualComissao = comissao?.percentual_comissao || 0;
            const valorFaturamento = comissao?.valor_faturamento || 0;
            const valorImposto = comissao?.valor_imposto || 0;
            const impostoEstado = vaga.imposto_estado || 0;
            const valorLucro = comissao?.valor_lucro || 0;

            const row = sheet.addRow([
                vaga.codigo,
                vaga.cargo,
                this.getClientName(vaga.client),
                this.getStatusLabel(vaga.status),
                this.formatDate(vaga.data_abertura),
                vaga.data_fechamento_cancelamento ? this.formatDate(vaga.data_fechamento_cancelamento) : '-',
                vaga.salario || 0,
                valorFaturamento,
                impostoEstado / 100,
                valorImposto,
                valorLucro,
                percentualComissao / 100,
                parseFloat(valorComissao)
            ]);

            // Aplicar formato brasileiro
            row.getCell(7).numFmt = 'R$ #,##0.00';   // Salário
            row.getCell(8).numFmt = 'R$ #,##0.00';   // Valor Faturamento
            row.getCell(9).numFmt = '0.00%';          // Imposto %
            row.getCell(10).numFmt = 'R$ #,##0.00';  // Valor Imposto
            row.getCell(11).numFmt = 'R$ #,##0.00';  // Valor Lucro
            row.getCell(12).numFmt = '0.00%';         // % Comissão
            row.getCell(13).numFmt = 'R$ #,##0.00';  // Valor Comissão
        });

        sheet.columns = [
            { width: 12 },  // Código
            { width: 30 },  // Cargo
            { width: 30 },  // Cliente
            { width: 20 },  // Status
            { width: 15 },  // Data Abertura
            { width: 15 },  // Data Fechamento
            { width: 15 },  // Salário
            { width: 18 },  // Valor Faturamento
            { width: 12 },  // Imposto %
            { width: 15 },  // Valor Imposto
            { width: 15 },  // Valor Lucro
            { width: 12 },  // % Comissão
            { width: 18 }   // Valor Comissão
        ];

        return await workbook.xlsx.writeBuffer();
    }

    // ============= RELATÓRIO DE VAGAS ABERTAS =============
    async generateRsOpenVacanciesReportPDF() {
        const vagas = await this.fetchVagas({ status: 'aberta' });

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));

        // Header com logo
        this.addPdfHeader(doc, 'Relatório de Vagas Abertas', `Total: ${vagas.length} vagas`);

        // Listagem
        vagas.forEach((vaga, index) => {
            // Adicionar nova página se necessário
            if (doc.y > 650) {
                doc.addPage();
            }

            doc.fontSize(10).font('Helvetica-Bold').fillColor('#003b2b').text(`${index + 1}. ${vaga.cargo}`);
            doc.fontSize(9).font('Helvetica').fillColor('#333333');
            doc.text(`   Código: ${vaga.codigo}`);
            doc.text(`   Cliente: ${this.getClientName(vaga.client)}`);
            doc.text(`   Consultora: ${vaga.user?.name || 'N/A'}`);
            doc.text(`   Tipo: ${this.getTipoCargoLabel(vaga.tipo_cargo)}`);
            doc.text(`   Salário: R$ ${vaga.salario?.toFixed(2).replace('.', ',') || '0,00'}`);
            doc.text(`   Aberta em: ${this.formatDate(vaga.data_abertura)}`);
            doc.moveDown(0.5);
        });

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
        });
    }

    async generateRsOpenVacanciesReportExcel() {
        const vagas = await this.fetchVagas({ status: 'aberta' });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Vagas Abertas');

        // Header
        sheet.mergeCells('A1:G1');
        sheet.getCell('A1').value = 'RELATÓRIO DE VAGAS ABERTAS';
        sheet.getCell('A1').font = { size: 16, bold: true };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:G2');
        sheet.getCell('A2').value = `Total: ${vagas.length} vagas abertas`;
        sheet.getCell('A2').alignment = { horizontal: 'center' };

        // Tabela
        sheet.addRow([]);
        const headerRow = sheet.addRow(['Código', 'Cargo', 'Cliente', 'Consultora', 'Tipo', 'Salário', 'Data Abertura']);
        headerRow.font = { bold: true };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

        vagas.forEach(vaga => {
            const row = sheet.addRow([
                vaga.codigo,
                vaga.cargo,
                this.getClientName(vaga.client),
                vaga.user?.name || 'N/A',
                this.getTipoCargoLabel(vaga.tipo_cargo),
                vaga.salario || 0,
                this.formatDate(vaga.data_abertura)
            ]);

            // Aplicar formato brasileiro de moeda
            row.getCell(6).numFmt = 'R$ #,##0.00';
        });

        sheet.columns = [
            { width: 12 },
            { width: 30 },
            { width: 30 },
            { width: 25 },
            { width: 15 },
            { width: 15 },
            { width: 15 }
        ];

        return await workbook.xlsx.writeBuffer();
    }

    // ============= RELATÓRIO INDIVIDUAL DE VAGA =============
    async generateRsIndividualReportPDF(vagaId) {
        // Buscar dados completos da vaga
        const { data: vaga, error } = await supabase
            .from('vagas')
            .select(`
                *,
                client:clients(
                    *,
                    clients_pj!clients_pj_client_id_fkey(*),
                    clients_pf!clients_pf_client_id_fkey(*)
                ),
                user:users!user_id(id, name),
                candidato_aprovado:candidatos(id, nome),
                vaga_candidatos(
                    id,
                    status,
                    data_inscricao,
                    observacoes,
                    candidato:candidatos(id, nome, email, telefone, status)
                )
            `)
            .eq('id', vagaId)
            .single();

        if (error) throw new Error(`Erro ao buscar vaga: ${error.message}`);
        if (!vaga) throw new Error('Vaga não encontrada');

        // Buscar entrevistas
        const { data: entrevistas } = await supabase
            .from('entrevistas')
            .select(`
                *,
                vaga_candidato:vaga_candidatos(
                    candidato:candidatos(nome)
                )
            `)
            .in('vaga_candidato_id', vaga.vaga_candidatos?.map(vc => vc.id) || []);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));

        // Header com logo
        this.addPdfHeader(doc, 'Relatório Individual de Vaga', `Código: ${vaga.codigo}`);

        // Informações Básicas da Vaga em caixa
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Informações da Vaga');
        doc.moveDown(1);

        const infoBoxY = doc.y;
        // Calcular altura da caixa dinamicamente
        let infoBoxHeight = 240; // Base
        if (vaga.data_fechamento_cancelamento) infoBoxHeight += 15;
        if ((vaga.status === 'fechada' || vaga.status === 'fechada_rep') && vaga.candidato_aprovado) infoBoxHeight += 15;
        doc.roundedRect(50, infoBoxY, doc.page.width - 100, infoBoxHeight, 5)
           .lineWidth(1)
           .strokeColor('#003b2b')
           .fillAndStroke('#f9f9f9', '#003b2b');

        doc.fillColor('#333333');
        doc.fontSize(10).font('Helvetica');
        let yPos = infoBoxY + 15;
        const lineHeight = 15;
        doc.text(`Código: ${vaga.codigo}`, 70, yPos); yPos += lineHeight;
        doc.text(`Cargo: ${vaga.cargo}`, 70, yPos); yPos += lineHeight;
        doc.text(`Cliente: ${this.getClientName(vaga.client)}`, 70, yPos); yPos += lineHeight;
        doc.text(`Consultora Responsável: ${vaga.user?.name || 'N/A'}`, 70, yPos); yPos += lineHeight;
        doc.text(`Status: ${this.getStatusLabel(vaga.status)}`, 70, yPos); yPos += lineHeight;
        doc.text(`Tipo de Cargo: ${this.getTipoCargoLabel(vaga.tipo_cargo)}`, 70, yPos); yPos += lineHeight;
        doc.text(`Tipo de Abertura: ${vaga.tipo_abertura === 'nova' ? 'Nova' : 'Reposição'}`, 70, yPos); yPos += lineHeight;
        doc.text(`Fonte de Recrutamento: ${vaga.fonte_recrutamento || 'N/A'}`, 70, yPos); yPos += lineHeight;
        doc.text(`Salário: R$ ${vaga.salario?.toFixed(2).replace('.', ',') || '0,00'}`, 70, yPos); yPos += lineHeight;
        doc.text(`Porcentagem de Faturamento: ${vaga.porcentagem_faturamento || 100}%`, 70, yPos); yPos += lineHeight;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#003b2b');
        doc.text(`Valor de Faturamento: R$ ${vaga.valor_faturamento?.toFixed(2).replace('.', ',') || '0,00'}`, 70, yPos); yPos += lineHeight;
        doc.fontSize(10).font('Helvetica').fillColor('#333333');
        doc.text(`Data de Abertura: ${this.formatDate(vaga.data_abertura)}`, 70, yPos); yPos += lineHeight;
        if (vaga.data_fechamento_cancelamento) {
            doc.text(`Data de Fechamento: ${this.formatDate(vaga.data_fechamento_cancelamento)}`, 70, yPos); yPos += lineHeight;
        }
        // Mostrar candidato aprovado se a vaga estiver fechada
        if ((vaga.status === 'fechada' || vaga.status === 'fechada_rep') && vaga.candidato_aprovado) {
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#007a33');
            doc.text(`✓ Candidato Selecionado: ${vaga.candidato_aprovado.nome}`, 70, yPos);
        }

        doc.y = infoBoxY + infoBoxHeight + 15;

        // Candidatos
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Candidatos');
        doc.moveDown(0.5);
        const candidatos = vaga.vaga_candidatos || [];
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text(`Total de Candidatos: ${candidatos.length}`);
        doc.moveDown(1);

        if (candidatos.length > 0) {
            candidatos.forEach((vc, index) => {
                // Adicionar nova página se necessário
                if (doc.y > 680) {
                    doc.addPage();
                }

                doc.fontSize(10).font('Helvetica-Bold').fillColor('#003b2b').text(`${index + 1}. ${vc.candidato?.nome || 'N/A'}`);
                doc.fontSize(9).font('Helvetica').fillColor('#333333');
                doc.text(`   Status: ${this.getCandidatoStatusLabel(vc.candidato?.status) || 'N/A'}`);
                doc.text(`   Email: ${vc.candidato?.email || 'N/A'}`);
                doc.text(`   Telefone: ${vc.candidato?.telefone || 'N/A'}`);
                doc.text(`   Data de Inscrição: ${this.formatDate(vc.data_inscricao)}`);
                if (vc.observacoes) {
                    doc.text(`   Observações: ${vc.observacoes}`);
                }
                doc.moveDown(0.5);
            });
        } else {
            doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666666').text('Nenhum candidato cadastrado.');
        }
        doc.moveDown(1.5);

        // Entrevistas
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Entrevistas Agendadas/Realizadas');
        doc.moveDown(1);
        if (entrevistas && entrevistas.length > 0) {
            entrevistas.forEach((entrevista, index) => {
                // Adicionar nova página se necessário
                if (doc.y > 680) {
                    doc.addPage();
                }

                doc.fontSize(10).font('Helvetica-Bold').fillColor('#003b2b').text(`${index + 1}. ${entrevista.vaga_candidato?.candidato?.nome || 'N/A'}`);
                doc.fontSize(9).font('Helvetica').fillColor('#333333');
                doc.text(`   Data: ${this.formatDate(entrevista.data_entrevista)}`);
                doc.text(`   Horário: ${entrevista.hora_entrevista || 'N/A'}`);
                doc.text(`   Status: ${entrevista.status || 'N/A'}`);
                if (entrevista.link_chamada) {
                    doc.text(`   Link: ${entrevista.link_chamada}`);
                }
                if (entrevista.observacoes) {
                    doc.text(`   Observações: ${entrevista.observacoes}`);
                }
                doc.moveDown(0.5);
            });
        } else {
            doc.fontSize(9).font('Helvetica-Oblique').fillColor('#666666').text('Nenhuma entrevista agendada.');
        }
        doc.moveDown(1.5);

        // Observações Gerais
        if (vaga.observacoes) {
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#003b2b').text('Observações Gerais');
            doc.moveDown(1);
            doc.fontSize(10).font('Helvetica').fillColor('#333333').text(vaga.observacoes, { align: 'justify' });
        }

        doc.end();

        return new Promise((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);
        });
    }

    async generateRsIndividualReportExcel(vagaId) {
        // Buscar dados completos da vaga
        const { data: vaga, error } = await supabase
            .from('vagas')
            .select(`
                *,
                client:clients(
                    *,
                    clients_pj!clients_pj_client_id_fkey(*),
                    clients_pf!clients_pf_client_id_fkey(*)
                ),
                user:users!user_id(id, name),
                candidato_aprovado:candidatos(id, nome),
                vaga_candidatos(
                    id,
                    status,
                    data_inscricao,
                    observacoes,
                    candidato:candidatos(id, nome, email, telefone, status)
                )
            `)
            .eq('id', vagaId)
            .single();

        if (error) throw new Error(`Erro ao buscar vaga: ${error.message}`);
        if (!vaga) throw new Error('Vaga não encontrada');

        // Buscar entrevistas
        const { data: entrevistas } = await supabase
            .from('entrevistas')
            .select(`
                *,
                vaga_candidato:vaga_candidatos(
                    candidato:candidatos(nome)
                )
            `)
            .in('vaga_candidato_id', vaga.vaga_candidatos?.map(vc => vc.id) || []);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Relatório Individual');

        // Header
        sheet.mergeCells('A1:D1');
        sheet.getCell('A1').value = 'RELATÓRIO INDIVIDUAL DE VAGA';
        sheet.getCell('A1').font = { size: 16, bold: true };
        sheet.getCell('A1').alignment = { horizontal: 'center' };

        sheet.mergeCells('A2:D2');
        sheet.getCell('A2').value = `Código: ${vaga.codigo}`;
        sheet.getCell('A2').alignment = { horizontal: 'center' };

        // Informações da Vaga
        sheet.addRow([]);
        sheet.addRow(['INFORMAÇÕES DA VAGA']).font = { bold: true };
        sheet.addRow(['Código', vaga.codigo]);
        sheet.addRow(['Cargo', vaga.cargo]);
        sheet.addRow(['Cliente', this.getClientName(vaga.client)]);
        sheet.addRow(['Consultora Responsável', vaga.user?.name || 'N/A']);
        sheet.addRow(['Status', this.getStatusLabel(vaga.status)]);
        sheet.addRow(['Tipo de Cargo', this.getTipoCargoLabel(vaga.tipo_cargo)]);
        sheet.addRow(['Tipo de Abertura', vaga.tipo_abertura === 'nova' ? 'Nova' : 'Reposição']);
        sheet.addRow(['Fonte de Recrutamento', vaga.fonte_recrutamento]);

        const salarioIndividualRow = sheet.addRow(['Salário', vaga.salario || 0]);
        salarioIndividualRow.getCell(2).numFmt = 'R$ #,##0.00';

        const percentFaturamentoRow = sheet.addRow(['Porcentagem de Faturamento', (vaga.porcentagem_faturamento || 100) / 100]);
        percentFaturamentoRow.getCell(2).numFmt = '0.00%';

        const valorFaturamentoIndividualRow = sheet.addRow(['Valor de Faturamento', vaga.valor_faturamento || 0]);
        valorFaturamentoIndividualRow.getCell(2).numFmt = 'R$ #,##0.00';
        sheet.addRow(['Data de Abertura', this.formatDate(vaga.data_abertura)]);
        if (vaga.data_fechamento_cancelamento) {
            sheet.addRow(['Data de Fechamento', this.formatDate(vaga.data_fechamento_cancelamento)]);
        }
        // Mostrar candidato aprovado se a vaga estiver fechada
        if ((vaga.status === 'fechada' || vaga.status === 'fechada_rep') && vaga.candidato_aprovado) {
            const candidatoRow = sheet.addRow(['✓ Candidato Selecionado', vaga.candidato_aprovado.nome]);
            candidatoRow.font = { bold: true, color: { argb: 'FF007A33' } };
        }

        // Candidatos
        sheet.addRow([]);
        sheet.addRow(['CANDIDATOS']).font = { bold: true };
        const candidatos = vaga.vaga_candidatos || [];
        sheet.addRow(['Total de Candidatos', candidatos.length]);

        if (candidatos.length > 0) {
            sheet.addRow([]);
            const candidatosHeaderRow = sheet.addRow(['Nome', 'Status', 'Email', 'Telefone', 'Data Inscrição']);
            candidatosHeaderRow.font = { bold: true };
            candidatosHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

            candidatos.forEach(vc => {
                sheet.addRow([
                    vc.candidato?.nome || 'N/A',
                    this.getCandidatoStatusLabel(vc.candidato?.status) || 'N/A',
                    vc.candidato?.email || 'N/A',
                    vc.candidato?.telefone || 'N/A',
                    this.formatDate(vc.data_inscricao)
                ]);
            });
        }

        // Entrevistas
        sheet.addRow([]);
        sheet.addRow(['ENTREVISTAS']).font = { bold: true };

        if (entrevistas && entrevistas.length > 0) {
            sheet.addRow([]);
            const entrevistasHeaderRow = sheet.addRow(['Candidato', 'Data', 'Horário', 'Status', 'Link']);
            entrevistasHeaderRow.font = { bold: true };
            entrevistasHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

            entrevistas.forEach(ent => {
                sheet.addRow([
                    ent.vaga_candidato?.candidato?.nome || 'N/A',
                    this.formatDate(ent.data_entrevista),
                    ent.hora_entrevista || 'N/A',
                    ent.status || 'N/A',
                    ent.link_chamada || ''
                ]);
            });
        } else {
            sheet.addRow(['Nenhuma entrevista agendada']);
        }

        // Observações
        if (vaga.observacoes) {
            sheet.addRow([]);
            sheet.addRow(['OBSERVAÇÕES GERAIS']).font = { bold: true };
            sheet.addRow([vaga.observacoes]);
        }

        sheet.columns = [
            { width: 30 },
            { width: 25 },
            { width: 30 },
            { width: 20 },
            { width: 40 }
        ];

        return await workbook.xlsx.writeBuffer();
    }
}

module.exports = new RsReportService();
