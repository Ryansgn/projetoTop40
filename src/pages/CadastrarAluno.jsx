import { useState, useMemo, useEffect, useRef } from 'react'
import { createAluno, createInfoSaude, fetchCepInfo, uploadFotoAluno } from '../api'
import InputMask from 'react-input-mask'
import '../styles/admin/index.css'
import '../styles/form.css'

export default function CadastrarAluno({ user, onClose, onOpenDrawer }) {
  const [step, setStep] = useState(1)           // 1-dados | 2-contato | 3-saúde | 4-restrições
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(null)
  const [showPwd, setShowPwd] = useState(false)
  const [idAluno, setIdAluno] = useState(null)

  // foto (opcional)
  const [fotoFile, setFotoFile] = useState(null)

  // Step 1
  const [Nome_Alu, setNome] = useState('')
  const [Tel_Alu, setTel] = useState('')
  const [CEP, setCEP] = useState('')
  const [Logradouro, setLogradouro] = useState('')
  const [Bairro, setBairro] = useState('')
  const [Cidade, setCidade] = useState('')
  const [UF, setUF] = useState('SP')
  const [Numero, setNumero] = useState('')
  const [Complemento, setComplemento] = useState('') // COMPLEMENTO (opcional)

  // CEP
  const [cepBusy, setCepBusy] = useState(false)
  const [cepErr, setCepErr] = useState('')

  // Step 2
  const [CPF_Alu, setCPF] = useState('')
  const [RG_Alu, setRG] = useState('')
  const [Email_Alu, setEmail] = useState('')
  const [Senha_Alu, setSenha] = useState('')
  const [SenhaConfirm, setSenhaConfirm] = useState('')
  const [Genero_Alu, setGenero] = useState('Não informar')
  const [DataNasc_Alu, setDataNasc] = useState('')
  const emailRef = useRef(null)

  // Step 3 (saúde)
  const [Peso_Alu, setPeso] = useState('')
  const [Altura_Alu, setAltura] = useState('')

  // Step 4 (objetivos/condições)
  const [objetivo, setObjetivo] = useState('')

  const [cirurgiasYN, setCirurgiasYN] = useState('NÃO')
  const [cirurgias, setCirurgias] = useState('')

  const [pressaoYN, setPressaoYN] = useState('NÃO')
  const [pressao, setPressao] = useState('')

  const [cardioYN, setCardioYN] = useState('NÃO')
  const [cardio, setCardio] = useState('')

  // Diabetes (coluna própria no banco)
  const [diabetesYN, setDiabetesYN] = useState('NÃO')
  const [diabetes, setDiabetes] = useState('')

  const [remedioYN, setRemedioYN] = useState('NÃO')
  const [remedio, setRemedio] = useState('')

  const [outras, setOutras] = useState('')

  // Observações livres (sem misturar diabetes)
  const observacoesFinal = useMemo(
    () => (outras || '').trim(),
    [outras]
  )

  // IMC
  const imc = useMemo(() => {
    const peso = parseFloat(String(Peso_Alu).replace(',', '.'))
    const alt  = parseFloat(String(Altura_Alu).replace(',', '.'))
    if (!peso || !alt) return null
    return Math.round((peso / (alt * alt)) * 100) / 100
  }, [Peso_Alu, Altura_Alu])

  const imcStatus = useMemo(() => {
    if (imc == null) return ''
    if (imc < 18.5) return 'Abaixo do peso'
    if (imc < 25)   return 'Peso normal'
    if (imc < 30)   return 'Sobrepeso'
    return 'Obesidade'
  }, [imc])

  // ===== Regras de senha =====
  const senhaChecks = useMemo(() => {
    const s = String(Senha_Alu || '')
    return {
      minLength: s.length >= 8,
      upper: /[A-Z]/.test(s),
      lower: /[a-z]/.test(s),
      number: /[0-9]/.test(s),
      symbol: /[^A-Za-z0-9]/.test(s),
    }
  }, [Senha_Alu])

  const senhaAtendeRequisitos =
    senhaChecks.minLength &&
    senhaChecks.upper &&
    senhaChecks.lower &&
    senhaChecks.number &&
    senhaChecks.symbol

  const senhasConferem = !!Senha_Alu && Senha_Alu === SenhaConfirm

  const sanitizeEmail = (v) => String(v || '').trim().toLowerCase()
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  function next1() {
    setErr('')
    // complemento é OPCIONAL, por isso não entra no if
    if (!Nome_Alu || !Tel_Alu || !CEP || !Logradouro || !Bairro || !Cidade || !UF || !Numero) {
      setErr('Preencha todos os campos do passo 1.')
      return
    }
    if (Number(Numero) <= 0) { setErr('O número do endereço deve ser maior que zero.'); return }
    setStep(2)
  }

  // === etapa 2: não salva nada, só valida ===
  function next2() {
    setErr(''); setOk(null)
    const emailNorm = sanitizeEmail(Email_Alu)

    if (!emailNorm || !Senha_Alu || !DataNasc_Alu) {
      setErr('Preencha todos os campos do passo 2 (incluindo e-mail, senha e data de nascimento).')
      return
    }

    if (!validEmail(emailNorm)) {
      setErr('Informe um e-mail válido.')
      emailRef.current?.focus()
      return
    }

    if (!senhaAtendeRequisitos) {
      setErr('A senha não atende aos requisitos de segurança.')
      return
    }

    if (!senhasConferem) {
      setErr('As senhas não coincidem.')
      return
    }

    setStep(3)
  }

  function next3() {
    setErr('')
    if (!Peso_Alu || !Altura_Alu) { setErr('Informe peso e altura.'); return }
    if (cirurgiasYN === 'SIM' && !cirurgias) { setErr('Descreva as cirurgias.'); return }
    if (pressaoYN === 'SIM' && !pressao) { setErr('Descreva a condição de pressão.'); return }
    if (cardioYN === 'SIM' && !cardio) { setErr('Descreva a condição cardiovascular.'); return }

    // valida diabetes
    if (diabetesYN === 'SIM' && !diabetes) {
      setErr('Descreva a condição de diabetes.');
      return
    }

    if (remedioYN === 'SIM' && !remedio) { setErr('Informe o remédio controlado.'); return }
    setStep(4)
  }

  // === cria aluno + saúde só no final ===
  async function finish() {
    setErr(''); setOk(null)

    // revalida passo 1
    if (!Nome_Alu || !Tel_Alu || !CEP || !Logradouro || !Bairro || !Cidade || !UF || !Numero) {
      setErr('Revise o passo 1: faltam dados obrigatórios.')
      return
    }
    if (Number(Numero) <= 0) {
      setErr('O número do endereço deve ser maior que zero.')
      return
    }

    // revalida passo 2
    const emailNorm = sanitizeEmail(Email_Alu)
    if (!emailNorm || !Senha_Alu || !DataNasc_Alu) {
      setErr('Revise o passo 2: preencha e-mail, senha e data de nascimento.')
      return
    }
    if (!validEmail(emailNorm)) {
      setErr('Informe um e-mail válido.')
      emailRef.current?.focus()
      return
    }
    if (!senhaAtendeRequisitos) {
      setErr('Revise o passo 2: a senha não atende aos requisitos de segurança.')
      return
    }
    if (!senhasConferem) {
      setErr('Revise o passo 2: as senhas não coincidem.')
      return
    }

    // revalida passo 3/4
    if (!Peso_Alu || !Altura_Alu) { setErr('Informe peso e altura.'); return }
    if (cirurgiasYN === 'SIM' && !cirurgias) { setErr('Descreva as cirurgias.'); return }
    if (pressaoYN === 'SIM' && !pressao) { setErr('Descreva a condição de pressão.'); return }
    if (cardioYN === 'SIM' && !cardio) { setErr('Descreva a condição cardiovascular.'); return }

    // revalida diabetes também no final
    if (diabetesYN === 'SIM' && !diabetes) {
      setErr('Descreva a condição de diabetes.');
      return
    }

    if (remedioYN === 'SIM' && !remedio) { setErr('Informe o remédio controlado.'); return }

    setLoading(true)
    try {
      // 1) Se ainda não existir, cria o aluno + endereço
      let alunoId = idAluno
      if (!alunoId) {
        const payload = {
          Nome_Alu,
          Email_Alu: emailNorm,
          Tel_Alu,
          CPF_Alu,
          // Data já vem em AAAA-MM-DD do input type="date"
          DataNasc_Alu,
          Genero_Alu,
          Senha_Alu,
          RG_Alu,
          endereco: {
            UF,
            Cidade,
            Bairro,
            Logradouro,
            CEP,
            Numero: Number(Numero),
            Complemento,
          },
        }

        const resAluno = await createAluno(payload)
        if (!resAluno.ok) {
          if (resAluno.error === 'email_dup') {
            setErr('Este e-mail já está cadastrado.')
            emailRef.current?.focus()
          } else {
            setErr(resAluno.message || resAluno.error || 'Erro ao salvar dados do aluno')
          }
          setLoading(false)
          return
        }

        alunoId = resAluno.idAluno
        setIdAluno(alunoId)

        // upload de foto (se houver)
        if (fotoFile) {
          try {
            const up = await uploadFotoAluno(alunoId, fotoFile)
            if (!up?.ok) console.warn('Falha no upload da foto:', up)
          } catch (e) {
            console.warn('Erro ao enviar foto:', e)
          }
        }
      }

      // 2) Salva as informações de saúde ligadas ao aluno
      const resSaude = await createInfoSaude({
        idAluno: alunoId,
        Peso_Alu: String(Peso_Alu).replace(',', '.'),
        Altura_Alu: String(Altura_Alu).replace(',', '.'),
        Objetivo_Alu: objetivo || '',

        Cirurgia_Alu:  cirurgiasYN,
        Pressao_Alu:   pressaoYN,
        Cardio_Alu:    cardioYN,
        Remedio_Alu:   remedioYN,

        Cirurgia_Desc: (cirurgiasYN === 'SIM') ? cirurgias : '',
        Pressao_Desc:  (pressaoYN  === 'SIM') ? pressao   : '',
        Cardio_Desc:   (cardioYN   === 'SIM') ? cardio    : '',
        Remedio_Desc:  (remedioYN  === 'SIM') ? remedio   : '',

        // Diabetes em coluna própria
        Diabetes_Alu:  diabetesYN === 'SIM' ? 'sim' : 'nao',
        Diabetes_Desc: diabetesYN === 'SIM' ? diabetes.trim() : '',

        Restricoes_Alu: observacoesFinal,
        idAdministrador: user?.id || 1,
      })

      if (resSaude.ok) {
        setOk('Cadastro concluído!')
        try { window.dispatchEvent(new Event('alunoCadastrado')) } catch {}
        setTimeout(() => onClose?.(), 600)
      } else {
        setErr(resSaude.message || resSaude.error || 'Erro ao salvar informações de saúde')
      }
    } catch (e) {
      console.error(e)
      setErr('Falha na comunicação com o servidor')
    } finally {
      setLoading(false)
    }
  }

  // CEP autofill
  useEffect(() => {
    const digits = String(CEP).replace(/\D/g, '');
    setCepErr('');
    if (digits.length !== 8) return;

    const t = setTimeout(async () => {
      setCepBusy(true);
      try {
        const r = await fetchCepInfo(digits);
        if (r?.ok || r?.cep || r?.logradouro || r?.bairro || r?.cidade || r?.uf) {
          setUF(prev => r.uf || r.state || prev);
          setCidade(prev => r.cidade || r.localidade || prev);
          setBairro(prev => r.bairro || prev);
          setLogradouro(prev => r.logradouro || prev);
        } else {
          setCepErr('CEP não encontrado. Preencha manualmente.');
        }
      } catch {
        setCepErr('Falha ao consultar o CEP. Preencha manualmente.');
      } finally { setCepBusy(false); }
    }, 400);

    return () => clearTimeout(t);
  }, [CEP]);

  return (
    <>
      {/* Cabeçalho local do cadastro (leve), sem duplicar o header do Admin */}
      <header className="adm-alunos-header">
        <button
          type="button"
          className="mt-back"
          aria-label="voltar"
          onClick={onClose}
          title="Voltar para a tela anterior"
        >
          ←
        </button>
        <button
          type="button"
          className="hamburger"
          aria-label="abrir menu"
          onClick={() => onOpenDrawer?.()}
          title="Abrir menu"
        >
        </button>
        <h2>CADASTRAR ALUNO</h2>
      </header>

      {/* PASSO 1 */}
      {step === 1 && (
        <div className="form-card">
          <label>Nome completo:</label>
          <input
            value={Nome_Alu}
            onChange={e => {
              const v = e.target.value;
              const onlyLetters = v.replace(/[^A-Za-zÀ-ÿ\s]/g, "");
              setNome(onlyLetters);
            }}
            placeholder="Nome completo"
          />

          <label>Telefone:</label>
          <InputMask
            mask="(99) 99999-9999"
            value={Tel_Alu}
            onChange={e=>setTel(e.target.value)}
            placeholder="(00) 00000-0000"
          />

          <label>CEP:</label>
          <InputMask
            mask="99999-999"
            value={CEP}
            onChange={e=>setCEP(e.target.value)}
            placeholder="00000-000"
          />
          {cepBusy && <small style={{color:'#555'}}>Consultando CEP…</small>}
          {cepErr && <small style={{color:'#b42318'}}>{cepErr}</small>}

          <label>Endereço:</label>
          <input
            value={Logradouro}
            onChange={e=>setLogradouro(e.target.value)}
            placeholder="Rua / Avenida"
          />

          <label>Número:</label>
          <input
            type="number"
            value={Numero}
            onChange={e=>setNumero(e.target.value)}
            placeholder="0"
          />

          <label>Complemento:</label>
          <input
            value={Complemento}
            onChange={e=>setComplemento(e.target.value)}
            placeholder="Apto, bloco, casa, etc. (opcional)"
          />

          <label>Bairro:</label>
          <input
            value={Bairro}
            onChange={e=>setBairro(e.target.value)}
            placeholder="Bairro"
          />

          <label>Cidade:</label>
          <input
            value={Cidade}
            onChange={e=>setCidade(e.target.value)}
            placeholder="Cidade"
          />

          <label>Estado (UF):</label>
          <select value={UF} onChange={e=>setUF(e.target.value)}>
            {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf=>(
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>

          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="primary" onClick={next1}>PRÓXIMO →</button>
          </div>
        </div>
      )}

      {/* PASSO 2 */}
      {step === 2 && (
        <div className="form-card">
          <label>CPF:</label>
          <InputMask
            mask="999.999.999-99"
            value={CPF_Alu}
            onChange={e=>setCPF(e.target.value)}
            placeholder="000.000.000-00"
          />

          <label>Identidade (RG):</label>
          <InputMask
            mask="99.999.999-A"
            formatChars={{
              '9': '[0-9]',
              'A': '[0-9Xx]'
            }}
            value={RG_Alu}
            onChange={e => setRG(e.target.value)}
            placeholder="00.000.000-0 ou 00.000.000-X"
          />

          <label>E-mail:</label>
          <input
            ref={emailRef}
            type="email"
            value={Email_Alu}
            onChange={e=>setEmail(sanitizeEmail(e.target.value))}
            placeholder="email@exemplo.com"
          />

          <label>Senha de acesso:</label>
          <div className="pwd">
            <input
              type={showPwd ? 'text' : 'password'}
              value={Senha_Alu}
              onChange={e=>setSenha(e.target.value)}
              placeholder="Digite a senha"
            />
            <button
              type="button"
              className="eye"
              onClick={()=>setShowPwd(s=>!s)}
              aria-label={showPwd ? 'ocultar senha' : 'mostrar senha'}
            >
              👁️
            </button>
          </div>

          <div className="pwd-checklist">
            <p className="pwd-title">A senha precisa ter:</p>
            <ul>
              <li className={senhaChecks.minLength ? 'ok' : ''}>
                Mínimo de 8 caracteres
              </li>
              <li className={senhaChecks.upper ? 'ok' : ''}>
                Pelo menos 1 letra maiúscula (A–Z)
              </li>
              <li className={senhaChecks.lower ? 'ok' : ''}>
                Pelo menos 1 letra minúscula (a–z)
              </li>
              <li className={senhaChecks.number ? 'ok' : ''}>
                Pelo menos 1 número (0–9)
              </li>
              <li className={senhaChecks.symbol ? 'ok' : ''}>
                Pelo menos 1 símbolo (! @ # $ % ...)
              </li>
            </ul>
          </div>

          <label>Confirmar senha:</label>
          <div className="pwd">
            <input
              type={showPwd ? 'text' : 'password'}
              value={SenhaConfirm}
              onChange={e=>setSenhaConfirm(e.target.value)}
              placeholder="Repita a senha"
            />
          </div>

          {SenhaConfirm && (
            <p className={senhasConferem ? 'ok' : 'error'}>
              {senhasConferem
                ? '✔ As senhas conferem.'
                : 'As senhas não são iguais.'}
            </p>
          )}

          <label>Gênero:</label>
          <select value={Genero_Alu} onChange={e=>setGenero(e.target.value)}>
            <option>Masculino</option>
            <option>Feminino</option>
            <option>Não informar</option>
          </select>

          <label>Data de nascimento:</label>
          <input
            type="date"
            value={DataNasc_Alu}
            onChange={e => setDataNasc(e.target.value)}
          />

          <label>Foto de perfil (opcional):</label>
          <div className="file-upload">
            <label className="file-btn">
              Selecionar foto
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFotoFile(e.target.files?.[0] || null)}
              />
            </label>
            {fotoFile && (
              <span className="file-name">{fotoFile.name}</span>
            )}
          </div>

          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="ghost" onClick={()=>setStep(1)}>← VOLTAR</button>
            <button className="primary" onClick={next2}>
              AVANÇAR PARA SAÚDE
            </button>
          </div>
        </div>
      )}

      {/* PASSO 3 */}
      {step === 3 && (
        <div className="form-card">
          <label>Peso (kg):</label>
          <InputMask
            mask="999,99"
            value={Peso_Alu}
            onChange={e=>setPeso(e.target.value)}
            placeholder="75,0"
          />

          <label>Altura (m):</label>
          <InputMask
            mask="9,99"
            value={Altura_Alu}
            onChange={e=>setAltura(e.target.value)}
            placeholder="1,70"
          />

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

      {/* PASSO 4 */}
      {step === 4 && (
        <div className="form-card">
          <div style={{fontWeight:800, textAlign:'center', margin:'4px 0 6px'}}>
            Quais são os OBJETIVOS?
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {['GANHAR MÚSCULOS','PERDER PESO','ESPORTES','GANHAR FORÇA'].map(opt=>(
              <button
                key={opt}
                type="button"
                onClick={()=>setObjetivo(opt)}
                style={{
                  padding:'14px 10px', borderRadius:12, border:'0',
                  background: objetivo===opt ? '#015329' : '#ddd',
                  color: objetivo===opt ? '#fff' : '#222', fontWeight:700
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <label style={{marginTop:12}}>Já fez cirurgias?</label>
          <select value={cirurgiasYN} onChange={e=>setCirurgiasYN(e.target.value)}>
            <option value="NÃO">Não</option>
            <option value="SIM">Sim</option>
          </select>
          {cirurgiasYN === 'SIM' && (
            <input
              value={cirurgias}
              onChange={e=>setCirurgias(e.target.value)}
              placeholder="Descreva a(s) cirurgia(s)"
            />
          )}

          <label>Possui pressão alta/baixa?</label>
          <select value={pressaoYN} onChange={e=>setPressaoYN(e.target.value)}>
            <option value="NÃO">Não</option>
            <option value="SIM">Sim</option>
          </select>
          {pressaoYN === 'SIM' && (
            <input
              value={pressao}
              onChange={e=>setPressao(e.target.value)}
              placeholder="Descreva a condição (ex.: hipertensão)"
            />
          )}

          <label>Possui problemas cardiovasculares?</label>
          <select value={cardioYN} onChange={e=>setCardioYN(e.target.value)}>
            <option value="NÃO">Não</option>
            <option value="SIM">Sim</option>
          </select>
          {cardioYN === 'SIM' && (
            <input
              value={cardio}
              onChange={e=>setCardio(e.target.value)}
              placeholder="Descreva o problema"
            />
          )}

          <label>Possui diabetes?</label>
          <select value={diabetesYN} onChange={e=>setDiabetesYN(e.target.value)}>
            <option value="NÃO">Não</option>
            <option value="SIM">Sim</option>
          </select>
          {diabetesYN === 'SIM' && (
            <input
              value={diabetes}
              onChange={e=>setDiabetes(e.target.value)}
              placeholder="Descreva (tipo, controle, uso de insulina etc.)"
            />
          )}

          <label>Toma remédio controlado?</label>
          <select value={remedioYN} onChange={e=>setRemedioYN(e.target.value)}>
            <option value="NÃO">Não</option>
            <option value="SIM">Sim</option>
          </select>
          {remedioYN === 'SIM' && (
            <input
              value={remedio}
              onChange={e=>setRemedio(e.target.value)}
              placeholder="Qual remédio?"
            />
          )}

          <label>Observações:</label>
          <input
            value={outras}
            onChange={e=>setOutras(e.target.value)}
            placeholder="—"
          />

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
    </>
  )
}
