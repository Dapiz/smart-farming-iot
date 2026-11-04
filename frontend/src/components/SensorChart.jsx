import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function SensorChart({ title, labels, datasets, yLabel, unit = '' }) {
  const data = {
    labels,
    datasets: datasets.map(ds => ({
      ...ds,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      fill: true,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: datasets.length > 1, position: 'top' },
      title:  { display: !!title, text: title, align: 'start', font: { size: 14, weight: '600' } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y ?? '--'}${unit}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6, font: { size: 10 } },
      },
      y: {
        beginAtZero: false,
        title: { display: !!yLabel, text: yLabel },
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 10 } },
      },
    },
  };

  return (
    <div className="card animate-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <div className="flex items-center gap-1">
          {datasets.map((d, i) => (
            <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: d.borderColor }} />
          ))}
        </div>
      </div>
      <div className="h-56 md:h-64">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}