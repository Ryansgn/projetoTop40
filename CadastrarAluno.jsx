import { useState, useMemo } from 'react'
import { createAluno, createInfoSaude } from '../api'
import InputMask from 'react-input-mask'
import '../styles/form.css'

export default function CadastrarAluno({ user, onClose }) {
  const [step, setStep] = useState(1)           // 1-dados | 2-contato | 3-saúde | 4-restrições
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(null)
  const [showPwd, setShowPwd] = useState(false)
  const [idAluno, setIdAluno] = useState(null)  // será preenchido após criar aluno

  // Step 1
  const [Nome_Alu, setNome] = useState('')
  const [Tel_Alu, setTel] = useState('')
  const [CEP, setCEP] = useState('')
  const [Logradouro, setLogradouro] = useState('')
  const [Bairro, setBairro] = useState('')
  const [Cidade, setCidade] = useState('') // UI only
  const [Numero, setNumero] = useState('')

  // Step 2
  const [UF, setUF] = useState('SP')
  const [CPF_Alu, setCPF] = useState('')
  const [RG_Alu, setRG] = useState('')
  const [Email_Alu, setEmail] = useState('')
  const [Senha_Alu, setSenha] = useState('')
  const [Genero_Alu, setGenero] = useState('Não informar')
  const [DataNasc_Alu, setDataNasc] = useState('')

  // Step 3 (saúde básica)
  const [Peso_Alu, setPeso] = useState('')     // kg (texto -> normalizo)
  const [Altura_Alu, setAltura] = useState('') // m (texto -> normalizo)

  // Step 4 (restrições/objetivo)
  const [objetivo, setObjetivo] = useState('') // GANHAR MÚSCULOS | PERDER PESO | ESPORTES | GANHAR FORÇA
  const [cirurgiasYN, setCirurgiasYN] = useState('NÃO')
  const [cirurgias, setCirurgias] = useState('')
  const [pressaoYN, setPressaoYN] = useState('NÃO')
  const [pressao, setPressao] = useState('')
  const [cardioYN, setCardioYN] = useState('NÃO')
  const [cardio, setCardio] = useState('')
  const [remedioYN, setRemedioYN] = useState('NÃO')
  const [remedio, setRemedio] = useState('')
  const [outras, setOutras] = useState('')
  const restricoesTexto = useMemo(() => {
    const linhas = []
    if (objetivo) linhas.push(`Objetivo: ${objetivo}`)
    if (cirurgias)linhas.push(`Cirurgias: ${cirurgias}`)
    if (pressao)  linhas.push(`Pressão: ${pressao}`)
    if (cardio)   linhas.push(`Cardiovasculares: ${cardio}`)
    if (remedio)  linhas.push(`Remédio controlado: ${remedio}`)
    if (outras)   linhas.push(`Observações: ${outras}`)
    return linhas.join('\n')
  }, [objetivo, cirurgias, pressao, cardio, remedio, outras])

  // IMC calculado
  const imc = useMemo(() => {
    const peso = parseFloat(String(Peso_Alu).replace(',', '.'))
    const alt  = parseFloat(String(Altura_Alu).replace(',', '.'))
    if (!peso || !alt) return null
    const v = peso / (alt * alt)
    return Math.round(v * 100) / 100
  }, [Peso_Alu, Altura_Alu])

  const imcStatus = useMemo(() => {
    if (imc == null) return ''
    if (imc < 18.5) return 'Abaixo do peso'
    if (imc < 25)   return 'Peso normal'
    if (imc < 30)   return 'Sobrepeso'
    return 'Obesidade'
  }, [imc])

  // helpers
  function toISO(dateStr) {
    if (!dateStr) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    const m = dateStr.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
    if (m) return `${m[3]}-${m[2]}-${m[1]}`
    return dateStr
  }

  function next1() {
    setErr('')
    if (!Nome_Alu || !Tel_Alu || !CEP || !Logradouro || !Bairro || !Numero) {
      setErr('Preencha todos os campos do passo 1.')
      return
    }
    if (Number(Numero) <= 0) { setErr('O número do endereço deve ser maior que zero.'); return }
    setStep(2)
  }

  async function next2() {
    setErr(''); setOk(null)
    if (!UF || !Email_Alu || !Senha_Alu || !DataNasc_Alu) {
      setErr('Preencha todos os campos do passo 2 (incluindo a data).')
      return
    }
    setLoading(true)
    try {
      const payload = {
        UF, Bairro, Logradouro, CEP, Numero: Number(Numero),
        Nome_Alu, Email_Alu, Tel_Alu, CPF_Alu,
        DataNasc_Alu: toISO(DataNasc_Alu),
        Genero_Alu, Senha_Alu, RG_Alu,
      }
      const res = await createAluno(payload)
      if (res.ok) {
        setIdAluno(res.idAluno)
        setStep(3) // vai para saúde
      } else {
        setErr(res.message || res.error || 'Erro ao salvar dados do aluno')
      }
    } catch {
      setErr('Falha na comunicação com o servidor')
    } finally {
      setLoading(false)
    }
  }

  function next3() {
    setErr('')
    if (!Peso_Alu || !Altura_Alu) { setErr('Informe peso e altura.'); return }
    if (cirurgiasYN === 'SIM' && !cirurgias) { setErr('Descreva as cirurgias.'); return }
    if (pressaoYN === 'SIM' && !pressao) { setErr('Descreva a condição de pressão.'); return }
    if (cardioYN === 'SIM' && !cardio) { setErr('Descreva a condição cardiovascular.'); return }
    if (remedioYN === 'SIM' && !remedio) { setErr('Informe o remédio controlado.'); return }
    setStep(4)
  }

  async function finish() {
    setErr(''); setOk(null)
    if (!idAluno) { setErr('Aluno ainda não foi criado.'); return }
    setLoading(true)
    try {
      const res = await createInfoSaude({
        idAluno,
        Peso_Alu: String(Peso_Alu).replace(',', '.'),
        Altura_Alu: String(Altura_Alu).replace(',', '.'),
        Restricoes_Alu: restricoesTexto || '',
        idAdministrador: user?.id || 1, // fallback
      })
      if (res.ok) {
        setOk('Cadastro concluído!');
        try { window.dispatchEvent(new Event('alunoCadastrado')); } catch {}
        // opcional: fechar ou voltar ao início
        setTimeout(() => onClose?.(), 600)
      } else {
        setErr(res.message || res.error || 'Erro ao salvar informações de saúde')
      }
    } catch {
      setErr('Falha na comunicação com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-wrap">
      <header className="form-header">
        <button className="back" onClick={onClose} aria-label="voltar">←</button>
        <div className="title">CADASTRAR ALUNO</div>
      </header>

      {/* PASSO 1 */}
      {step === 1 && (
        <div className="form-card">
          <label>Nome completo:</label>
          <input value={Nome_Alu} onChange={e=>setNome(e.target.value)} placeholder="Nome completo"/>
          <label>Telefone:</label>
          <InputMask mask="(99) 99999-9999" value={Tel_Alu} onChange={e=>setTel(e.target.value)} placeholder="(00) 00000-0000" />
          <label>CEP:</label>
          <InputMask mask="99999-999" value={CEP} onChange={e=>setCEP(e.target.value)} placeholder="00000-000" />
          <label>Endereço:</label>
          <input value={Logradouro} onChange={e=>setLogradouro(e.target.value)} placeholder="Rua / Avenida"/>
          <label>Bairro:</label>
          <input value={Bairro} onChange={e=>setBairro(e.target.value)} placeholder="Bairro"/>
          <label>Cidade:</label>
          <input value={Cidade} onChange={e=>setCidade(e.target.value)} placeholder="Cidade (não salvo)"/>
          <label>Número:</label>
          <input type="number" value={Numero} onChange={e=>setNumero(e.target.value)} placeholder="0"/>
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="primary" onClick={next1}>PRÓXIMO →</button>
          </div>
        </div>
      )}

      {/* PASSO 2 */}
      {step === 2 && (
        <div className="form-card">
          <label>Estado:</label>
          <select value={UF} onChange={e=>setUF(e.target.value)}>
            {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf=>(
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          <label>CPF:</label>
          <InputMask mask="999.999.999-99" value={CPF_Alu} onChange={e=>setCPF(e.target.value)} placeholder="000.000.000-00" />
          <label>Identidade (RG):</label>
          <InputMask mask="99.999.999-9" value={RG_Alu} onChange={e=>setRG(e.target.value)} placeholder="00.000.000-0" />
          <label>E-mail:</label>
          <input type="email" value={Email_Alu} onChange={e=>setEmail(e.target.value)} placeholder="email@exemplo.com"/>
          <label>Senha:</label>
          <div className="pwd">
            <input type={showPwd ? 'text' : 'password'} value={Senha_Alu} onChange={e=>setSenha(e.target.value)} placeholder="••••••"/>
            <button type="button" className="eye" onClick={()=>setShowPwd(s=>!s)} aria-label="mostrar senha">👁️</button>
          </div>
          <label>Gênero:</label>
          <select value={Genero_Alu} onChange={e=>setGenero(e.target.value)}>
            <option>Masculino</option>
            <option>Feminino</option>
            <option>Não informar</option>
          </select>
          <label>Data de nascimento:</label>
          <InputMask mask="99/99/9999" value={DataNasc_Alu} onChange={e=>setDataNasc(e.target.value)} placeholder="DD/MM/AAAA" />
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="ghost" onClick={()=>setStep(1)}>← VOLTAR</button>
            <button className="primary" onClick={next2} disabled={loading}>{loading ? 'Salvando...' : 'AVANÇAR PARA SAÚDE'}</button>
          </div>
        </div>
      )}

      {/* PASSO 3 - PESO/ALTURA */}
      {step === 3 && (
        <div className="form-card">
          <label>Peso (kg):</label>
          <InputMask mask="999,9" value={Peso_Alu} onChange={e=>setPeso(e.target.value)} placeholder="075,0" />
          <label>Altura (m):</label>
          <InputMask mask="9,99" value={Altura_Alu} onChange={e=>setAltura(e.target.value)} placeholder="1,70" />
          <label>IMC:</label>
          <input value={imc ?? ''} readOnly placeholder="—"/>
          <div style={{color:'#666', marginTop:-6, marginBottom:8}}>{imcStatus}</div>
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="ghost" onClick={()=>setStep(2)}>← VOLTAR</button>
            <button className="primary" onClick={next3}>PRÓXIMO →</button>
          </div>
        </div>
      )}

      {/* PASSO 4 - RESTRIÇÕES / OBJETIVOS */}
      {step === 4 && (
        <div className="form-card">
          <div style={{fontWeight:800, textAlign:'center', margin:'4px 0 6px'}}>Quais são os OBJETIVOS?</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {['GANHAR MÚSCULOS','PERDER PESO','ESPORTES','GANHAR FORÇA'].map(opt=>(
              <button key={opt}
                type="button"
                onClick={()=>setObjetivo(opt)}
                style={{
                  padding:'14px 10px', borderRadius:12, border:'0',
                  background: objetivo===opt ? '#4a0055' : '#ddd',
                  color: objetivo===opt ? '#fff' : '#222', fontWeight:700
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <label style={{marginTop:12}}>Já fez cirurgias?</label>
          <input value={cirurgias} onChange={e=>setCirurgias(e.target.value)} placeholder="—"/>

          <label>Possui pressão alta/baixa?</label>
          <select value={pressaoYN} onChange={e=>setPressaoYN(e.target.value)}>
            <option value="NÃO">Não</option>
            <option value="SIM">Sim</option>
          </select>
          {pressaoYN === 'SIM' && (
            <input value={pressao} onChange={e=>setPressao(e.target.value)} placeholder="Descreva a condição (ex.: hipertensão)"/>
          )}

          <label>Possui problemas cardiovasculares?</label>
          <select value={cardioYN} onChange={e=>setCardioYN(e.target.value)}>
            <option value="NÃO">Não</option>
            <option value="SIM">Sim</option>
          </select>
          {cardioYN === 'SIM' && (
            <input value={cardio} onChange={e=>setCardio(e.target.value)} placeholder="Descreva o problema"/>
          )}

          <label>Toma remédio controlado?</label>
          <select value={remedioYN} onChange={e=>setRemedioYN(e.target.value)}>
            <option value="NÃO">Não</option>
            <option value="SIM">Sim</option>
          </select>
          {remedioYN === 'SIM' && (
            <input value={remedio} onChange={e=>setRemedio(e.target.value)} placeholder="Qual remédio?"/>
          )}

          <label>Observações:</label>
          <input value={outras} onChange={e=>setOutras(e.target.value)} placeholder="—"/>

          {err && <p className="error">{err}</p>}
          {ok && <p className="ok">{ok}</p>}

          <div className="actions">
            <button className="ghost" onClick={()=>setStep(3)}>← VOLTAR</button>
            <button className="primary" onClick={finish} disabled={loading}>
              {loading ? 'Salvando...' : 'CONFIRMAR CADASTRO'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
