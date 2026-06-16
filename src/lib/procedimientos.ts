export interface Procedimiento {
  codigo: string
  titulo: string
  objetivo: string
  equipos: string[]
  pasos: string[]
}

const PROCEDIMIENTOS: Record<string, Procedimiento> = {
  MASA: {
    codigo: 'PR-MET-01',
    titulo: 'Verificación Metrológica de Balanzas e Instrumentos de Pesaje',
    objetivo: 'Describir los pasos para la verificación del correcto funcionamiento de las balanzas en el rango de trabajo diario.',
    equipos: [
      'Juego de pesas patrón calibradas y vigentes (Clase M1 o F1 según corresponda)',
      'Pincel de cerdas suaves para limpieza',
      'Guantes de algodón limpios para manipulación de pesas'
    ],
    pasos: [
      'Limpieza y Nivelación: Limpiar el plato de carga con el pincel. Ajustar los tornillos de las patas niveladoras hasta centrar completamente la burbuja del nivel de burbuja.',
      'Atemperamiento: Conectar el instrumento a la red eléctrica y dejarlo estabilizar encendido durante al menos 15 minutos antes de iniciar las mediciones.',
      'Prueba de Excentricidad (Carga no centrada): Colocar una pesa patrón equivalente a aproximadamente 1/3 de la capacidad máxima en el centro y posteriormente en las 4 posiciones del receptor de carga (esquinas). Anotar las lecturas.',
      'Prueba de Exactitud/Linealidad: Realizar mediciones con pesas patrón en 3 o más puntos distribuidos en la escala habitual de trabajo (ej: 20%, 50% y 100% de la capacidad máxima).',
      'Prueba de Repetibilidad: Cargar y descargar repetidamente una misma pesa patrón en el centro del plato 5 veces consecutivas, registrando la lectura cero en cada intervalo.',
      'Evaluación: Registrar los valores obtenidos en el formulario de la aplicación QMS. La app calculará las variaciones automáticamente y determinará la aptitud frente a la tolerancia del equipo.'
    ]
  },
  TEMPERATURA: {
    codigo: 'PR-MET-02',
    titulo: 'Verificación de Termómetros y Sensores de Temperatura',
    objetivo: 'Establecer el método para verificar termómetros digitales, de vidrio y sensores de temperatura mediante comparación directa.',
    equipos: [
      'Termómetro digital patrón de referencia calibrado',
      'Baño termostático de líquido circulante o termobloque seco de calibración',
      'Alcohol isopropílico para limpieza de vainas'
    ],
    pasos: [
      'Inspección Visual: Comprobar que el sensor no presente dobleces, trizaduras o corrosión. Limpiar la vaina del sensor con alcohol isopropílico.',
      'Acondicionamiento: Sumergir el sensor patrón y el sensor a verificar en el pozo del termobloque o baño termostático, procurando que estén a la misma profundidad de inmersión.',
      'Selección de Puntos: Definir los puntos de verificación según el rango de trabajo habitual del activo (ej: 0°C, 50°C y 100°C o temperaturas de refrigeración/congelación).',
      'Estabilización Térmica: Programar el baño/pozo a la temperatura deseada. Esperar que la lectura del patrón sea estable (variación menor a 0.05°C durante 2 minutos) antes de tomar datos.',
      'Lectura y Repetición: Tomar 3 lecturas alternadas entre el patrón y el instrumento en cada punto fijado.',
      'Registro: Ingresar las mediciones en la APP QMS para calcular el error sistemático promedio y determinar el apto.'
    ]
  },
  LONGITUD: {
    codigo: 'PR-MET-03',
    titulo: 'Procedimiento de Verificación para Calibradores y Pie de Metro',
    objetivo: 'Establecer las directrices de verificación de calibradores vernier (pie de metro) y micrómetros empleando bloques patrón de longitud.',
    equipos: [
      'Bloques patrón de longitud calibrados (Grado 1 o 2)',
      'Alcohol isopropílico y paños de microfibra antiestáticos',
      'Guantes de nitrilo'
    ],
    pasos: [
      'Limpieza: Limpiar minuciosamente las caras de medición exterior e interior del calibrador y los bloques patrón con alcohol isopropílico para eliminar grasitud.',
      'Verificación del Cero: Limpiar las mordazas de exteriores, cerrarlas firmemente y verificar que en la escala digital o vernier la coincidencia sea exactamente 0.00 mm.',
      'Prueba de Medición Exterior: Seleccionar al menos 3 bloques de longitudes representativas (ej: 25 mm, 75 mm, 125 mm). Medir los bloques sujetándolos en el centro de las mordazas exteriores y registrar las indicaciones.',
      'Prueba de Paralelismo: Medir un bloque de 50 mm colocándolo primero en la punta extrema de las mordazas de exteriores y luego en la sección más cercana a la escala. La diferencia de lectura no debe exceder la resolución del instrumento.',
      'Prueba de Medición de Interiores: Utilizar un bloque patrón acoplado con mordazas calibradas para verificar las caras de medición interna superiores del calibrador.',
      'Registro: Introducir las lecturas indicadas en la APP QMS para contrastarlas contra la tolerancia de desviación metrológica.'
    ]
  },
  PRESION: {
    codigo: 'PR-MET-04',
    titulo: 'Verificación Metrológica de Manómetros por Comparación Directa',
    objetivo: 'Establecer el procedimiento de comparación para verificar manómetros de aguja o digitales con un manómetro patrón.',
    equipos: [
      'Manómetro patrón de referencia de alta exactitud calibrado',
      'Bomba generadora de presión neumática o hidráulica manual',
      'Selladores de rosca adecuados (cinta teflón) y llaves de ajuste'
    ],
    pasos: [
      'Montaje de Equipos: Acoplar firmemente el manómetro patrón y el manómetro a verificar en los racores de la bomba generadora de presión.',
      'Pre-Presurización: Aplicar presión lentamente hasta alcanzar el límite superior del rango de medición del manómetro bajo prueba. Mantener durante 1 minuto y despresurizar completamente para purgar el sistema.',
      'Definición de Puntos: Establecer al menos 5 puntos de control distribuidos uniformemente a lo largo de la escala de indicación (ej: 20%, 40%, 60%, 80% y 100%).',
      'Ciclo Ascendente: Incrementar gradualmente la presión. En cada punto definido, tomar la indicación del manómetro a verificar deteniendo el ajuste en la lectura exacta del patrón. Evitar sobrepasar los puntos para no alterar los efectos de histéresis.',
      'Ciclo Descendente: Subir la presión ligeramente sobre el límite máximo, y luego descender paulatinamente repitiendo las lecturas en los mismos puntos fijados.',
      'Carga de Datos: Registrar los ciclos en la APP QMS, la cual evaluará la repetibilidad, el error de histéresis y la conformidad final.'
    ]
  },
  TIEMPO: {
    codigo: 'PR-MET-05',
    titulo: 'Verificación de Cronómetros y Temporizadores',
    objetivo: 'Verificar la exactitud de cronómetros digitales y temporizadores mediante el método de comparación con señales horarias.',
    equipos: [
      'Cronómetro patrón calibrado o servidor de tiempo NTP de referencia nacional',
      'Dispositivo de registro de tiempos'
    ],
    pasos: [
      'Examen Inicial: Probar el correcto rebote y sensibilidad de los pulsadores de Inicio, Parada y Reset.',
      'Selección de Intervalo: Definir los intervalos de verificación requeridos según la aplicación (ej: 60 s, 300 s, 1800 s).',
      'Medición Simultánea: Activar simultáneamente el cronómetro patrón y el instrumento bajo verificación.',
      'Toma de Tiempos: Al transcurrir el lapso fijado, detener ambos instrumentos en el mismo instante y registrar la lectura patrón e instrumental.',
      'Cálculo: Ingresar las mediciones en la APP para calcular la desviación en segundos por hora o porcentaje de error.'
    ]
  },
  ELECTRICA: {
    codigo: 'PR-MET-06',
    titulo: 'Verificación de Multímetros e Instrumentos de Medida Eléctrica',
    objetivo: 'Establecer los pasos para comprobar los rangos básicos de tensión, corriente y resistencia en multímetros portátiles.',
    equipos: [
      'Calibrador multifunción patrón o fuentes estables de tensión/corriente con multímetro de alta resolución patrón',
      'Cables de conexión con terminales banana protegidos'
    ],
    pasos: [
      'Preparación: Instalar las puntas de prueba en los bornes adecuados del multímetro. Comprobar visualmente que el aislamiento de los cables no esté agrietado.',
      'Ajuste del Cero: Seleccionar la función de resistencia en cortocircuito y realizar la compensación de resistencia de las puntas de prueba (función REL).',
      'Medición de Tensión (V DC/AC): Configurar el multímetro y el calibrador en el modo respectivo. Inyectar valores patrón en rangos comunes (ej: 1V, 10V, 100V) y anotar las indicaciones.',
      'Medición de Corriente (A DC/AC): Cambiar la punta de prueba al borne de corriente. Inyectar corrientes patrón dentro de los límites seguros (ej: 10 mA, 100 mA, 1 A).',
      'Medición de Resistencia (Ohm): Inyectar señales de resistencia conocidas desde el calibrador (ej: 100 Ω, 1 kΩ, 10 kΩ).',
      'Registro: Anotar las diferencias obtenidas en la APP QMS para el cálculo del error porcentual frente al límite de tolerancia.'
    ]
  },
  VOLUMEN: {
    codigo: 'PR-MET-07',
    titulo: 'Verificación de Material Volumétrico por Gravimetría',
    objetivo: 'Determinar el volumen real entregado o contenido en pipetas, probetas y recipientes graduados empleando balanzas analíticas.',
    equipos: [
      'Balanza analítica o de precisión debidamente verificada',
      'Agua destilada desgasificada',
      'Termómetro para líquidos y barómetro'
    ],
    pasos: [
      'Determinación de Densidad: Medir la temperatura del agua destilada utilizada. Buscar en tablas la densidad correspondiente del agua destilada a esa temperatura.',
      'Pesado de Recipiente Vacío (Tara): Colocar un vaso de precipitados limpio y seco sobre la balanza analítica y registrar el peso o tarar a cero.',
      'Transferencia de Volumen: Llenar el material volumétrico a verificar hasta la línea de aforo exacta. Transferir cuidadosamente el volumen total al vaso de precipitados colocado en la balanza.',
      'Pesado del Agua: Registrar la masa del agua transferida en la balanza.',
      'Repetibilidad del Ensayo: Repetir el llenado, vertido y pesado al menos 5 veces consecutivas utilizando la misma capacidad de aforo.',
      'Cálculo del Volumen Corregido: Registrar las masas en la APP QMS. El software aplicará el factor de corrección Z (gravedad, densidad y empuje del aire) para obtener el volumen exacto y la desviación.'
    ]
  },
  GENERAL: {
    codigo: 'PR-MET-GEN',
    titulo: 'Procedimiento General de Inspección y Verificación Metrológica',
    objetivo: 'Establecer los pasos para realizar una inspección física y funcional básica en activos y equipos no categorizados.',
    equipos: [
      'Herramientas básicas de limpieza',
      'Patrón específico o magnitudes auxiliares según el tipo de activo'
    ],
    pasos: [
      'Inspección Visual Externa: Comprobar el estado general del activo, buscando fisuras, roturas, cables dañados o piezas sueltas.',
      'Limpieza: Limpiar las superficies exteriores, pantallas y zonas de medición activa utilizando paños secos o aire comprimido de baja presión.',
      'Verificación Eléctrica / Encendido: Conectar a la corriente (o baterías) y encender. Comprobar que el arranque de software sea normal y que no se despliegen códigos de error en el display.',
      'Prueba de Desempeño Básico: Realizar una prueba funcional con una muestra física de control o simulación para evaluar que el equipo responda en forma coherente en todo su rango.',
      'Identificación: Asegurar que la etiqueta con el Código QR y la placa metálica de identificación del activo sean perfectamente legibles.',
      'Registro de Estado: Informar las observaciones del funcionamiento y condiciones ambientales en el sistema QMS para la actualización de la hoja de ruta.'
    ]
  }
}

export function getProcedimiento(magnitud: string | null | undefined): Procedimiento {
  if (!magnitud) return PROCEDIMIENTOS.GENERAL

  const magNormalized = magnitud.toUpperCase().trim()

  // Buscar coincidencia exacta o parcial
  if (magNormalized.includes('TEMPERATURA')) return PROCEDIMIENTOS.TEMPERATURA
  if (magNormalized.includes('MASA') || magNormalized.includes('PESAJ') || magNormalized.includes('PESO')) return PROCEDIMIENTOS.MASA
  if (magNormalized.includes('LONGITUD') || magNormalized.includes('DIMENSIONAL') || magNormalized.includes('METRO') || magNormalized.includes('PIE DE')) return PROCEDIMIENTOS.LONGITUD
  if (magNormalized.includes('PRESION') || magNormalized.includes('MANOMETR')) return PROCEDIMIENTOS.PRESION
  if (magNormalized.includes('TIEMPO') || magNormalized.includes('CRONOM')) return PROCEDIMIENTOS.TIEMPO
  if (magNormalized.includes('ELECTRICA') || magNormalized.includes('CORRIENT') || magNormalized.includes('VOLT')) return PROCEDIMIENTOS.ELECTRICA
  if (magNormalized.includes('VOLUMEN') || magNormalized.includes('PIPET') || magNormalized.includes('GRAVIME')) return PROCEDIMIENTOS.VOLUMEN

  return PROCEDIMIENTOS.GENERAL
}
