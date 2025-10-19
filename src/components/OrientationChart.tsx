import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface OrientationData {
  alpha: number | null;    // 0-360 (compass)
  beta: number | null;     // -180 to 180 (front-back tilt)
  gamma: number | null;    // -90 to 90 (left-right tilt)
  timestamp: number;
}

interface OrientationChartProps {
  data: OrientationData | null;
  className?: string;
}

export default function OrientationChart({ data, className = '' }: OrientationChartProps) {
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: (number | null)[];
      borderColor: string;
      backgroundColor: string;
    }[];
  }>({
    labels: [],
    datasets: [
      {
        label: 'Alpha (Compass)',
        data: [],
        borderColor: 'rgb(239, 68, 68)', // Red
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
      },
      {
        label: 'Beta (Front-Back)',
        data: [],
        borderColor: 'rgb(34, 197, 94)', // Green
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
      },
      {
        label: 'Gamma (Left-Right)',
        data: [],
        borderColor: 'rgb(59, 130, 246)', // Blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
      },
    ],
  });

  const maxDataPoints = 50; // Show last 50 data points (about 10 seconds at 5Hz)

  useEffect(() => {
    if (!data) return;

    setChartData(prev => {
      const newLabels = [...prev.labels];
      const newAlphaData = [...prev.datasets[0].data];
      const newBetaData = [...prev.datasets[1].data];
      const newGammaData = [...prev.datasets[2].data];

      // Add new data point
      const timeLabel = new Date(data.timestamp).toLocaleTimeString();
      newLabels.push(timeLabel);
      newAlphaData.push(data.alpha);
      newBetaData.push(data.beta);
      newGammaData.push(data.gamma);

      // Keep only the last maxDataPoints
      if (newLabels.length > maxDataPoints) {
        newLabels.shift();
        newAlphaData.shift();
        newBetaData.shift();
        newGammaData.shift();
      }

      return {
        labels: newLabels,
        datasets: [
          {
            ...prev.datasets[0],
            data: newAlphaData,
          },
          {
            ...prev.datasets[1],
            data: newBetaData,
          },
          {
            ...prev.datasets[2],
            data: newGammaData,
          },
        ],
      };
    });
  }, [data]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Device Orientation Data',
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Degrees',
        },
        min: -180,
        max: 360,
      },
    },
    elements: {
      point: {
        radius: 2,
      },
      line: {
        tension: 0.1,
      },
    },
  };

  return (
    <div className={`w-full h-64 ${className}`}>
      <Line data={chartData} options={options} />
    </div>
  );
}
