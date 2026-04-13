const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../db/database');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// Cores e estilos padrão
const COR_TITULO   = '#d4a017'; // gold
const COR_TEXTO    = '#1a1a2e';
const COR_SUBTITULO = '#374151';
const COR_LINHA    = '#e5e7eb';

function cabecalho(doc, titulo) {
  doc.rect(0, 0, doc.page.width, 70).fill('#0f2044');
  doc.fillColor('#d4a017').fontSize(18).font('Helvetica-Bold')
     .text('⚖ JurisCRM', 40, 20);
  doc.fillColor('#9ca3af').fontSize(9).font('Helvetica')
     .text('Sistema de Gestão Jurídica', 40, 42);
  doc.fillColor('white').fontSize(12).font('Helvetica-Bold')
     .text(titulo, 0, 25, { align: 'right', width: doc.page.width - 40 });
  doc.fillColor(COR_TEXTO);
  doc.y = 90;
}

function secao(doc, texto) {
  doc.moveDown(0.5);
  doc.rect(40, doc.y, doc.page.width - 80, 20).fill('#f3f4f6');
  doc.fillColor(COR_SUBTITULO).fontSize(9).font('Helvetica-Bold')
     .text(texto.toUpperCase(), 48, doc.y - 15);
  doc.fillColor(COR_TEXTO).font('Helvetica').fontSize(9);
  doc.moveDown(0.8);
}

function campo(doc, label, valor, x, y, largura = 240) {
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#6b7280').text(label, x, y);
  doc.font('Helvetica').fontSize(9).fillColor(COR_TEXTO).text(valor || '—', x, y + 12, { width: largura });
}

function linha(doc) {
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor(COR_LINHA).stroke();
  doc.moveDown(0.3);
}

// GET /relatorios/cliente/:id
router.get('/cliente/:id', autenticar, async (req, res) => {
  try {
    const cliente = await db.prepare(`
      SELECT c.*, u.nome as responsavel_nome
      FROM clientes c LEFT JOIN usuarios u ON c.responsavel_id = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado' });

    const processos = await db.prepare(`
      SELECT p.*, COUNT(m.id) as total_movimentacoes,
             SUM(CASE WHEN m.nova = 1 THEN 1 ELSE 0 END) as movimentacoes_novas
      FROM processos p
      LEFT JOIN movimentacoes m ON m.processo_id = p.id
      WHERE p.cliente_id = ?
      GROUP BY p.id ORDER BY p.atualizado_em DESC
    `).all(req.params.id);

    const anotacoes = await db.prepare(`
      SELECT a.*, u.nome as usuario_nome FROM anotacoes a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.cliente_id = ? ORDER BY a.criado_em DESC LIMIT 10
    `).all(req.params.id);

    const prazos = await db.prepare(`
      SELECT * FROM prazos WHERE cliente_id = ? AND status = 'pendente'
      ORDER BY data_vencimento ASC LIMIT 5
    `).all(req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cliente-${cliente.id}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    cabecalho(doc, 'Relatório de Cliente');

    // Dados do cliente
    secao(doc, 'Dados Cadastrais');
    const yBase = doc.y;
    campo(doc, 'Nome completo', cliente.nome, 40, yBase);
    campo(doc, 'CPF/CNPJ', cliente.cpf_cnpj, 310, yBase);
    doc.moveDown(2.5);
    campo(doc, 'E-mail', cliente.email, 40, doc.y);
    campo(doc, 'Celular', cliente.celular || cliente.telefone, 310, doc.y);
    doc.moveDown(2.5);
    campo(doc, 'Área Jurídica', cliente.area_juridica, 40, doc.y);
    campo(doc, 'Status', cliente.status_lead?.toUpperCase(), 310, doc.y);
    doc.moveDown(2.5);
    if (cliente.endereco) {
      campo(doc, 'Endereço', `${cliente.endereco}${cliente.cidade ? `, ${cliente.cidade}/${cliente.estado}` : ''}`, 40, doc.y, 500);
      doc.moveDown(2.5);
    }

    // Processos
    if (processos.length > 0) {
      secao(doc, `Processos (${processos.length})`);
      for (const p of processos) {
        if (doc.y > 700) doc.addPage();
        const yP = doc.y;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COR_TITULO).text(p.numero_cnj, 40, yP);
        doc.font('Helvetica').fontSize(8).fillColor(COR_SUBTITULO)
           .text(`${p.classe_processual || 'Classe não informada'} • ${p.tribunal || '—'} • ${(p.status || '').replace('_', ' ')}`, 40, yP + 12);
        if (p.ultima_movimentacao) {
          doc.fillColor('#6b7280').text(`Última mov.: ${p.ultima_movimentacao.slice(0, 80)}`, 40, yP + 24);
        }
        doc.moveDown(p.ultima_movimentacao ? 3.8 : 2.5);
        linha(doc);
      }
    }

    // Prazos pendentes
    if (prazos.length > 0) {
      secao(doc, 'Prazos Pendentes');
      for (const pz of prazos) {
        if (doc.y > 720) doc.addPage();
        const d = new Date(pz.data_vencimento + 'T00:00:00');
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COR_TEXTO).text(pz.titulo, 40, doc.y);
        doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
           .text(`${pz.tipo} • Vencimento: ${d.toLocaleDateString('pt-BR')} • Prioridade: ${pz.prioridade}`, 40, doc.y + 12);
        doc.moveDown(2.5);
      }
    }

    // Anotações recentes
    if (anotacoes.length > 0) {
      secao(doc, 'Anotações Recentes');
      for (const a of anotacoes) {
        if (doc.y > 700) doc.addPage();
        const ICONS = { nota: 'Nota', ligacao: 'Ligação', reuniao: 'Reunião', email: 'E-mail', tarefa: 'Tarefa' };
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COR_SUBTITULO)
           .text(`${ICONS[a.tipo] || 'Nota'} • ${new Date(a.criado_em).toLocaleDateString('pt-BR')} • ${a.usuario_nome || ''}`, 40, doc.y);
        doc.font('Helvetica').fontSize(9).fillColor(COR_TEXTO)
           .text(a.descricao, 40, doc.y + 12, { width: 510 });
        doc.moveDown(doc.heightOfString(a.descricao, { width: 510 }) / 12 + 1.5);
        linha(doc);
      }
    }

    // Rodapé
    const dataGeracao = new Date().toLocaleString('pt-BR');
    doc.fontSize(7).fillColor('#9ca3af')
       .text(`Gerado em ${dataGeracao} via JurisCRM`, 40, doc.page.height - 30, { align: 'center', width: doc.page.width - 80 });

    doc.end();
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    if (!res.headersSent) res.status(500).json({ erro: err.message });
  }
});

// GET /relatorios/processo/:id
router.get('/processo/:id', autenticar, async (req, res) => {
  try {
    const processo = await db.prepare(`
      SELECT p.*, c.nome as cliente_nome, c.cpf_cnpj as cliente_cpf
      FROM processos p LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!processo) return res.status(404).json({ erro: 'Processo não encontrado' });

    const movimentacoes = await db.prepare(`
      SELECT * FROM movimentacoes WHERE processo_id = ?
      ORDER BY data_movimentacao DESC
    `).all(req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="processo-${processo.id}.pdf"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    cabecalho(doc, 'Relatório de Processo');

    // Dados do processo
    secao(doc, 'Identificação do Processo');
    const yBase = doc.y;
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COR_TITULO)
       .text(processo.numero_cnj, 40, yBase);
    doc.moveDown(1.5);
    campo(doc, 'Classe Processual', processo.classe_processual, 40, doc.y);
    campo(doc, 'Assunto', processo.assunto, 310, doc.y);
    doc.moveDown(2.5);
    campo(doc, 'Tribunal', processo.tribunal, 40, doc.y);
    campo(doc, 'Vara / Juízo', processo.vara, 310, doc.y);
    doc.moveDown(2.5);
    campo(doc, 'Polo Ativo', processo.polo_ativo, 40, doc.y);
    campo(doc, 'Polo Passivo', processo.polo_passivo, 310, doc.y);
    doc.moveDown(2.5);
    campo(doc, 'Cliente', processo.cliente_nome, 40, doc.y);
    campo(doc, 'Valor da Causa', processo.valor_causa, 310, doc.y);
    doc.moveDown(2.5);
    campo(doc, 'Status', (processo.status || '').replace('_', ' ').toUpperCase(), 40, doc.y);
    if (processo.ultima_consulta_datajud) {
      campo(doc, 'Última Consulta DataJud', new Date(processo.ultima_consulta_datajud).toLocaleString('pt-BR'), 310, doc.y);
    }
    doc.moveDown(2.5);

    if (processo.observacoes) {
      secao(doc, 'Observações');
      doc.font('Helvetica').fontSize(9).fillColor(COR_TEXTO)
         .text(processo.observacoes, 40, doc.y, { width: 510 });
      doc.moveDown(1.5);
    }

    // Movimentações
    if (movimentacoes.length > 0) {
      secao(doc, `Movimentações (${movimentacoes.length})`);
      for (const m of movimentacoes) {
        if (doc.y > 700) doc.addPage();
        const data = m.data_movimentacao
          ? new Date(m.data_movimentacao).toLocaleDateString('pt-BR')
          : '—';
        doc.font('Helvetica-Bold').fontSize(8).fillColor(COR_SUBTITULO)
           .text(data, 40, doc.y, { width: 80, continued: true });
        doc.font('Helvetica').fontSize(9).fillColor(COR_TEXTO)
           .text(m.descricao, { width: 430 });
        if (m.complemento) {
          doc.font('Helvetica').fontSize(8).fillColor('#6b7280')
             .text(m.complemento, 120, doc.y, { width: 430 });
        }
        doc.moveDown(m.complemento ? 0.5 : 0.3);
        linha(doc);
      }
    } else {
      doc.font('Helvetica').fontSize(9).fillColor('#6b7280')
         .text('Nenhuma movimentação registrada.', 40, doc.y);
    }

    const dataGeracao = new Date().toLocaleString('pt-BR');
    doc.fontSize(7).fillColor('#9ca3af')
       .text(`Gerado em ${dataGeracao} via JurisCRM`, 40, doc.page.height - 30, { align: 'center', width: doc.page.width - 80 });

    doc.end();
  } catch (err) {
    console.error('Erro ao gerar relatório:', err);
    if (!res.headersSent) res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
