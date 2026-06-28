import type { ReactNode } from 'react';

/**
 * Contenido de ayuda contextual por módulo de WorldCupX. Versión condensada
 * del manual oficial (docs/manuales/manual-usuario.html y manual-admin.html)
 * pensada para mostrarse en un popover flotante sin sacar al usuario de la
 * pantalla en la que está.
 *
 * Para nuevos módulos: agregar una key + objeto { title, body }. Renderizar
 * con <InfoButton title={help.title}>{help.body}</InfoButton>.
 */

export interface HelpEntry {
  title: string;
  body: ReactNode;
}

export const help = {
  // ============================ COLABORADOR ============================
  dashboard: {
    title: '¿Qué es esta pantalla?',
    body: (
      <>
        <p>Es tu <strong>inicio</strong>. Aquí ves todos los tickets activados a tu nombre. Cada uno tiene su alias amigable (<em>Ticket 1, Ticket 2</em>).</p>
        <ul>
          <li>Si un ticket dice <strong>"Pendiente"</strong>, todavía no llenas la predicción.</li>
          <li>Si dice <strong>"En progreso"</strong>, abriste el wizard pero no enviaste.</li>
          <li>Si dice <strong>"Enviada"</strong>, ya quedó registrada para puntuar.</li>
        </ul>
        <p>El botón <strong>"Activar nuevo ticket"</strong> es para registrar el código <code>WCX-XXXXXXXX</code> que te dio TTHH.</p>
      </>
    )
  } as HelpEntry,

  claimTicket: {
    title: '¿Cómo activo un ticket?',
    body: (
      <>
        <p>TTHH te entregó un código tipo <code>WCX-XXXXXXXX</code>. Cópialo o tipéalo exactamente como aparece y presiona <strong>Activar</strong>.</p>
        <ul>
          <li>Solo puedes activar tickets <strong>asociados a tu cédula</strong>.</li>
          <li>Una vez activado, ese ticket es tuyo y aparece en tu dashboard.</li>
          <li>Si ya fue activado por alguien más (o anulado), no se podrá usar.</li>
        </ul>
        <p>El plazo límite para activar y predecir es el <strong>10 de junio 2026 · 23:59</strong>.</p>
      </>
    )
  } as HelpEntry,

  predictionGroups: {
    title: 'Predicción · Fase de grupos',
    body: (
      <>
        <p>Llena el marcador exacto de los <strong>72 partidos</strong> de la fase de grupos (12 grupos × 6 partidos).</p>
        <ul>
          <li><strong>Marcador exacto</strong> = +3 pts (ej. predijiste 2-1, salió 2-1).</li>
          <li><strong>Resultado correcto</strong> = +1 pt (ej. predijiste 2-1, salió 3-2; ambos ganó el local).</li>
          <li>Cada vez que escribes una posición se autocalcula la <strong>tabla de posiciones</strong> abajo.</li>
        </ul>
        <p>Lo que escribes se guarda automáticamente. Puedes volver y editar antes del deadline.</p>
      </>
    )
  } as HelpEntry,

  predictionThird: {
    title: '¿Qué son los mejores terceros?',
    body: (
      <>
        <p>En el Mundial 2026, los <strong>8 mejores terceros</strong> de los 12 grupos también clasifican a dieciseisavos.</p>
        <ul>
          <li>Debes elegir exactamente <strong>8 equipos</strong> de la lista (los 12 terceros).</li>
          <li>Cada uno se asigna a un slot específico del bracket.</li>
          <li>Si ves "0/8", no has asignado ninguno. Cuando completes 8, podrás continuar.</li>
        </ul>
        <p>Pista: típicamente clasifican los terceros con más puntos y mejor diferencia de gol.</p>
      </>
    )
  } as HelpEntry,

  predictionKnockout: {
    title: 'Predicción · Eliminatorias',
    body: (
      <>
        <p>Desde dieciseisavos (R32) hasta la Final. Para cada partido eliges el <strong>marcador</strong> y el <strong>equipo que avanza</strong>.</p>
        <ul>
          <li>Si predices <strong>empate</strong>, debes marcar quién gana por penales.</li>
          <li>El bracket se propaga: el ganador de tu R32 aparece automáticamente en R16.</li>
          <li>Si cambias un ganador en una ronda anterior, las rondas siguientes se resetean.</li>
        </ul>
        <p><strong>Cruce flexible</strong>: si aciertas el partido pero en orden invertido (ej. predijiste "A vs B" y el real fue "B vs A"), también puntúa.</p>
      </>
    )
  } as HelpEntry,

  predictionSummary: {
    title: 'Resumen y envío',
    body: (
      <>
        <p>Última revisión antes de enviar. Aquí ves:</p>
        <ul>
          <li>Tu <strong>campeón</strong> y <strong>tercer puesto</strong> predichos.</li>
          <li>Puntos potenciales si todo te sale.</li>
          <li>Cualquier sección incompleta queda marcada.</li>
        </ul>
        <p>Al presionar <strong>Enviar predicción</strong>, queda registrada. Puedes volver a editar cuantas veces quieras hasta el deadline.</p>
      </>
    )
  } as HelpEntry,

  ranking: {
    title: 'Cómo leer el ranking',
    body: (
      <>
        <p>Lista de todos los tickets activos ordenados por puntos. Cada fila es un ticket con su alias amigable.</p>
        <ul>
          <li><strong>Puntos totales</strong> = marcador + posiciones + cruces + avances + bonos.</li>
          <li><strong>Aciertos exactos</strong>: cuántas veces clavaste el marcador (+3 c/u).</li>
          <li><strong>Resultados correctos</strong>: cuántas veces acertaste el ganador (+1 c/u).</li>
        </ul>
        <p>El ranking se actualiza cuando admin carga los resultados reales y dispara "Recalcular".</p>
      </>
    )
  } as HelpEntry,

  scoringPreview: {
    title: '¿Por qué muestra tantos puntos?',
    body: (
      <>
        <p>Es la <strong>vista previa</strong> calculada en tu navegador asumiendo que <em>todas tus predicciones se cumplen</em>. No son puntos reales todavía.</p>
        <ul>
          <li>+3 por marcador exacto · +1 por resultado correcto</li>
          <li>+1 por equipo en posición correcta de grupo (gate de 6 partidos llenos)</li>
          <li>Avance ronda: R32 +2 · R16 +4 · QF +8 · SF +10</li>
          <li>Bonos: campeón +20 · tercer puesto +10</li>
        </ul>
        <p>Los puntos oficiales se asignan cuando admin carga resultados reales y recalcula.</p>
      </>
    )
  } as HelpEntry,

  // ============================ ADMIN / TTHH ============================
  adminSummary: {
    title: 'Panel de resumen',
    body: (
      <>
        <p>Vista general del estado de la polla:</p>
        <ul>
          <li><strong>Tickets vendidos</strong>: total emitidos (sin contar anulados).</li>
          <li><strong>Reclamados</strong>: colaboradores que ya activaron su ticket en la app.</li>
          <li><strong>Pendientes</strong>: vendidos pero aún sin reclamar.</li>
          <li><strong>Predicciones enviadas</strong>: las que ya van a puntuar.</li>
        </ul>
        <p>Útil antes del deadline para ver cuánta gente falta.</p>
      </>
    )
  } as HelpEntry,

  adminSales: {
    title: 'Vender un ticket',
    body: (
      <>
        <p>Busca al colaborador por <strong>cédula, nombre o área</strong> y emítele un código:</p>
        <ul>
          <li>Si la persona ya tiene tickets vendidos, los chips muestran el conteo real.</li>
          <li>El código generado se le entrega <strong>físicamente o por chat</strong> al colaborador.</li>
          <li>Solo puedes vender <strong>antes del 10 de junio 2026</strong>.</li>
        </ul>
        <p>Si la persona prefiere papel y no usar la app, igual le entregas el código y luego tú cargas la predicción por ella desde "Tickets → Cargar predicción".</p>
      </>
    )
  } as HelpEntry,

  adminTickets: {
    title: 'Gestión de tickets',
    body: (
      <>
        <p>Tabla con todos los tickets activos. Puedes:</p>
        <ul>
          <li><strong>Anular</strong> un ticket (pidiendo motivo). Queda invalidado.</li>
          <li><strong>Cargar predicción</strong> solo si el ticket está <em>vendido sin reclamar</em>. Es para transcribir el papel del colaborador que no se registró.</li>
          <li><strong>Descargar PDF</strong> de grupos o eliminatorias con la predicción actual.</li>
        </ul>
        <p>Una vez el colaborador reclama el ticket en la app, ya no puedes editar su predicción.</p>
      </>
    )
  } as HelpEntry,

  adminResultsGroups: {
    title: 'Resultados oficiales · grupos',
    body: (
      <>
        <p>Aquí cargas los <strong>marcadores reales</strong> que ocurrieron en el Mundial. Cada partido que llenes:</p>
        <ul>
          <li>Se guarda en <code>actual_match_results</code>.</li>
          <li>Recalcula la <strong>tabla de posiciones oficial</strong> del grupo.</li>
          <li>Cuando un grupo completa sus 6 partidos, libera el bracket de ese clasificado.</li>
        </ul>
        <p>Tip: carga los partidos en orden cronológico para evitar inconsistencias.</p>
      </>
    )
  } as HelpEntry,

  adminResultsKO: {
    title: 'Resultados oficiales · eliminatorias',
    body: (
      <>
        <p>Carga marcadores de R32 → Final. Cada partido propaga al siguiente:</p>
        <ul>
          <li>El ganador llena automáticamente el slot del siguiente partido (P73→P89, etc.).</li>
          <li>Si fue empate, marca al ganador por <strong>penales</strong>.</li>
          <li>Hasta que cargues un partido, los siguientes muestran "Esperando".</li>
        </ul>
        <p>El último partido genera el campeón y dispara los bonos.</p>
      </>
    )
  } as HelpEntry,

  adminRecalc: {
    title: '¿Cuándo recalcular?',
    body: (
      <>
        <p>El botón <strong>Recalcular puntajes</strong> recorre todas las predicciones enviadas y aplica el reglamento contra los resultados oficiales.</p>
        <ul>
          <li>Córrelo cada vez que cargues nuevos resultados.</li>
          <li>Actualiza <code>ticket_scores</code> y el ranking público.</li>
          <li>Tarda unos segundos según cuántos tickets haya.</li>
        </ul>
        <p>Es idempotente: correrlo dos veces da el mismo resultado.</p>
      </>
    )
  } as HelpEntry,

  adminPdfs: {
    title: 'Plantillas PDF imprimibles',
    body: (
      <>
        <p>Dos PDFs en blanco para entregar a colaboradores que prefieran llenar a mano:</p>
        <ul>
          <li><strong>Fase de grupos</strong> · 72 partidos con banderas + casillas para marcador.</li>
          <li><strong>Eliminatorias</strong> · bracket completo R32→Final con casillas.</li>
        </ul>
        <p>Luego TTHH transcribe el papel desde "Tickets → Cargar predicción" del ticket correspondiente.</p>
      </>
    )
  } as HelpEntry,

  // ============================ TRANSVERSAL ============================
  deadline: {
    title: 'Fecha límite',
    body: (
      <>
        <p>Todo cierra el <strong>10 de junio de 2026 a las 23:59</strong> (hora Ecuador).</p>
        <p>Después de esa fecha:</p>
        <ul>
          <li>No se pueden vender más tickets.</li>
          <li>No se pueden reclamar ni enviar predicciones.</li>
          <li>Solo queda cargar resultados, recalcular y ver el ranking.</li>
        </ul>
      </>
    )
  } as HelpEntry,

  alias: {
    title: '¿Qué es "Ticket 1, Ticket 2"?',
    body: (
      <>
        <p>Es el <strong>alias amigable</strong> que ve el colaborador y el ranking público. Cada persona numera sus propios tickets en orden cronológico.</p>
        <p>El <strong>código real</strong> (<code>WCX-XXXXXXXX</code>) solo lo usa TTHH al vender. Tú nunca necesitas recordarlo.</p>
      </>
    )
  } as HelpEntry
} as const;

export type HelpKey = keyof typeof help;
