function gerarParcelas(dataPrimeiroVencimento, parcelas, intervaloDias, options = {}) {
  const {
    tipoIntervalo = 'dias', // 'dias' ou 'meses'
    considerarDiasUteis = false,
    feriados = [] // Array de strings 'YYYY-MM-DD' para integração futura
  } = options;

  const datas = [];
  
  // Criar data no timezone local para evitar problemas de UTC
  const [ano, mes, dia] = dataPrimeiroVencimento.split('-').map(Number);
  let dataBase = new Date(ano, mes - 1, dia);

  for (let i = 0; i < parcelas; i++) {
    let novaData;

    if (tipoIntervalo === 'meses') {
      // Para intervalos mensais, manter o mesmo dia do mês
      novaData = new Date(dataBase);
      const diaOriginal = dataBase.getDate();
      novaData.setMonth(novaData.getMonth() + i);
      
      // Se o dia mudou (mês com menos dias), ajustar para o último dia do mês
      if (novaData.getDate() !== diaOriginal) {
        novaData.setDate(0); // Vai para o último dia do mês anterior
      }
    } else {
      // Para intervalos diários
      novaData = new Date(dataBase);
      novaData.setDate(novaData.getDate() + (i * intervaloDias));
    }

    // Ajustar para próximo dia útil se necessário
    if (considerarDiasUteis) {
      novaData = ajustarParaDiaUtil(novaData, feriados);
    }

    datas.push({
      parcela: i + 1,
      vencimento: formatarDataLocal(novaData)
    });
  }

  return datas;
}

function ajustarParaDiaUtil(data, feriados) {
  let novaData = new Date(data);
  
  while (true) {
    const diaSemana = novaData.getDay();
    const dataStr = formatarDataLocal(novaData);
    
    // Verificar se é fim de semana (0 = domingo, 6 = sábado)
    const isFimSemana = diaSemana === 0 || diaSemana === 6;
    
    // Verificar se é feriado
    const isFeriado = feriados.includes(dataStr);
    
    if (!isFimSemana && !isFeriado) {
      break;
    }
    
    // Avançar para o próximo dia
    novaData.setDate(novaData.getDate() + 1);
  }
  
  return novaData;
}

function formatarDataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Exemplo de uso:
console.log('--- Padrão (dias corridos) ---');
console.log(gerarParcelas("2026-04-10", 2, 30));

console.log('\n--- Com intervalo mensal ---');
console.log(gerarParcelas("2026-01-31", 4, 1, { tipoIntervalo: 'meses' }));

console.log('\n--- Considerando dias úteis ---');
console.log(gerarParcelas("2026-04-10", 3, 30, { considerarDiasUteis: true }));

console.log('\n--- Com feriados ---');
const feriadosExemplo = ["2026-05-01", "2026-06-12"];
console.log(gerarParcelas("2026-04-30", 2, 30, { considerarDiasUteis: true, feriados: feriadosExemplo }));
