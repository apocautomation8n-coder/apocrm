import { useState, useEffect } from 'react'
import { Calculator, RefreshCw, ArrowRightLeft, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react'
import { StatCard } from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function CurrencyConverter({ hideHeader = false }) {
  const [rates, setRates] = useState({
    usdBlue: { compra: 0, venta: 0, fecha: null },
    eur: { compra: 0, venta: 0, fecha: null }
  })
  const [loading, setLoading] = useState(true)
  const [amounts, setAmounts] = useState({
    usd: '1',
    ars_from_usd: '0',
    eur: '1',
    ars_from_eur: '0',
    ars_to_usd: '1000',
    usd_from_ars: '0',
    ars_to_eur: '1000',
    eur_from_ars: '0'
  })

  const fetchRates = async () => {
    setLoading(true)
    try {
      const [usdRes, eurRes] = await Promise.all([
        fetch('https://dolarapi.com/v1/dolares/blue'),
        fetch('https://dolarapi.com/v1/cotizaciones/eur')
      ])
      
      const usdData = await usdRes.json()
      const eurData = await eurRes.json()

      const newRates = {
        usdBlue: { 
          compra: usdData.compra, 
          venta: usdData.venta, 
          fecha: new Date(usdData.fechaActualizacion).toLocaleString('es-AR') 
        },
        eur: { 
          compra: eurData.compra, 
          venta: eurData.venta, 
          fecha: new Date(eurData.fechaActualizacion).toLocaleString('es-AR') 
        }
      }

      setRates(newRates)
      
      // Initial calculations
      setAmounts(prev => ({
        ...prev,
        ars_from_usd: (1 * newRates.usdBlue.venta).toFixed(2),
        ars_from_eur: (1 * newRates.eur.venta).toFixed(2),
        usd_from_ars: (1000 / newRates.usdBlue.compra).toFixed(2),
        eur_from_ars: (1000 / newRates.eur.compra).toFixed(2)
      }))

      toast.success('Cotizaciones actualizadas')
    } catch (err) {
      console.error('Error fetching rates:', err)
      toast.error('Error al obtener cotizaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRates() }, [])

  const handleConvert = (type, value) => {
    const val = parseFloat(value) || 0
    setAmounts(prev => {
      const next = { ...prev, [type]: value }
      
      if (type === 'usd') next.ars_from_usd = (val * rates.usdBlue.venta).toFixed(2)
      if (type === 'ars_from_usd') next.usd = (val / rates.usdBlue.venta).toFixed(2)
      
      if (type === 'eur') next.ars_from_eur = (val * rates.eur.venta).toFixed(2)
      if (type === 'ars_from_eur') next.eur = (val / rates.eur.venta).toFixed(2)
      
      if (type === 'ars_to_usd') next.usd_from_ars = (val / rates.usdBlue.compra).toFixed(2)
      if (type === 'usd_from_ars') next.ars_to_usd = (val * rates.usdBlue.compra).toFixed(2)
      
      if (type === 'ars_to_eur') next.eur_from_ars = (val / rates.eur.compra).toFixed(2)
      if (type === 'eur_from_ars') next.ars_to_eur = (val * rates.eur.compra).toFixed(2)

      return next
    })
  }

  return (
    <div className={`space-y-6 animate-fade-in max-w-5xl mx-auto ${!hideHeader ? 'p-6' : 'py-2'}`}>
      {/* Header */}
      {!hideHeader && (
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-3">
            <Calculator size={24} className="text-primary-400" />
            Conversión de Capital
          </h1>
          <p className="text-sm text-surface-400 mt-1">Calculadora de divisas en tiempo real (Dólar Blue y Euro)</p>
        </div>
        <Button onClick={fetchRates} disabled={loading} variant="secondary">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Actualizando...' : 'Actualizar cotizaciones'}
        </Button>
      </div>
      )}

      {/* Market Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* USD Blue Card */}
        <div className="bg-surface-900/60 border border-surface-800/60 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="font-bold text-surface-100">Dólar Blue</h3>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider font-semibold">Mercado Paralelo</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-[10px] text-surface-500 font-medium">
                <Clock size={10} />
                {rates.usdBlue.fecha || 'Cargando...'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
              <p className="text-xs text-surface-500 font-medium mb-1 flex items-center gap-1">
                <TrendingDown size={12} className="text-red-400" /> Compra
              </p>
              <p className="text-xl font-bold text-surface-100">${rates.usdBlue.compra}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
              <p className="text-xs text-surface-500 font-medium mb-1 flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-400" /> Venta
              </p>
              <p className="text-xl font-bold text-surface-100">${rates.usdBlue.venta}</p>
            </div>
          </div>
        </div>

        {/* EUR Card */}
        <div className="bg-surface-900/60 border border-surface-800/60 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <span className="text-lg font-bold">€</span>
              </div>
              <div>
                <h3 className="font-bold text-surface-100">Euro</h3>
                <p className="text-[10px] text-surface-500 uppercase tracking-wider font-semibold">Cotización Oficial</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-[10px] text-surface-500 font-medium">
                <Clock size={10} />
                {rates.eur.fecha || 'Cargando...'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
              <p className="text-xs text-surface-500 font-medium mb-1 flex items-center gap-1">
                <TrendingDown size={12} className="text-red-400" /> Compra
              </p>
              <p className="text-xl font-bold text-surface-100">${rates.eur.compra.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/30">
              <p className="text-xs text-surface-500 font-medium mb-1 flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-400" /> Venta
              </p>
              <p className="text-xl font-bold text-surface-100">${rates.eur.venta.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculators Section */}
      <h2 className="text-lg font-bold text-surface-200 pt-4 flex items-center gap-2">
        <ArrowRightLeft size={18} className="text-primary-500" />
        Calculadoras de Conversión
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* USD <-> ARS */}
        <div className="space-y-6">
          <div className="bg-surface-900/40 p-6 rounded-2xl border border-surface-800/40 space-y-4">
            <h4 className="text-sm font-bold text-surface-300">Vender USD / Comprar ARS</h4>
            <div className="grid grid-cols-1 gap-4">
              <Input 
                label="Tengo USD (Venta)" 
                type="number" 
                value={amounts.usd} 
                onChange={(e) => handleConvert('usd', e.target.value)} 
                placeholder="0"
                icon={DollarSign}
              />
              <Input 
                label="Recibo ARS" 
                type="number" 
                value={amounts.ars_from_usd} 
                onChange={(e) => handleConvert('ars_from_usd', e.target.value)} 
                placeholder="0"
                icon={<span className="text-xs font-bold">$</span>}
              />
            </div>
          </div>

          <div className="bg-surface-900/40 p-6 rounded-2xl border border-surface-800/40 space-y-4">
            <h4 className="text-sm font-bold text-surface-300">Vender ARS / Comprar USD</h4>
            <div className="grid grid-cols-1 gap-4">
              <Input 
                label="Tengo ARS (Compra)" 
                type="number" 
                value={amounts.ars_to_usd} 
                onChange={(e) => handleConvert('ars_to_usd', e.target.value)} 
                placeholder="0"
                icon={<span className="text-xs font-bold">$</span>}
              />
              <Input 
                label="Recibo USD" 
                type="number" 
                value={amounts.usd_from_ars} 
                onChange={(e) => handleConvert('usd_from_ars', e.target.value)} 
                placeholder="0"
                icon={DollarSign}
              />
            </div>
          </div>
        </div>

        {/* EUR <-> ARS */}
        <div className="space-y-6">
          <div className="bg-surface-900/40 p-6 rounded-2xl border border-surface-800/40 space-y-4">
            <h4 className="text-sm font-bold text-surface-300">Vender EUR / Comprar ARS</h4>
            <div className="grid grid-cols-1 gap-4">
              <Input 
                label="Tengo EUR (Venta)" 
                type="number" 
                value={amounts.eur} 
                onChange={(e) => handleConvert('eur', e.target.value)} 
                placeholder="0"
                icon={<span className="text-xs font-bold">€</span>}
              />
              <Input 
                label="Recibo ARS" 
                type="number" 
                value={amounts.ars_from_eur} 
                onChange={(e) => handleConvert('ars_from_eur', e.target.value)} 
                placeholder="0"
                icon={<span className="text-xs font-bold">$</span>}
              />
            </div>
          </div>

          <div className="bg-surface-900/40 p-6 rounded-2xl border border-surface-800/40 space-y-4">
            <h4 className="text-sm font-bold text-surface-300">Vender ARS / Comprar EUR</h4>
            <div className="grid grid-cols-1 gap-4">
              <Input 
                label="Tengo ARS (Compra)" 
                type="number" 
                value={amounts.ars_to_eur} 
                onChange={(e) => handleConvert('ars_to_eur', e.target.value)} 
                placeholder="0"
                icon={<span className="text-xs font-bold">$</span>}
              />
              <Input 
                label="Recibo EUR" 
                type="number" 
                value={amounts.eur_from_ars} 
                onChange={(e) => handleConvert('eur_from_ars', e.target.value)} 
                placeholder="0"
                icon={<span className="text-xs font-bold">€</span>}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/10 text-center">
        <p className="text-xs text-primary-400 font-medium">
          * Los cálculos se realizan utilizando el precio de **Venta** para convertir divisa extranjera a pesos, 
          y el precio de **Compra** para convertir pesos a divisa extranjera.
        </p>
      </div>
    </div>
  )
}
