export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12,
          family: "'Segoe UI', sans-serif",
          weight: '500'
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      titleColor: '#1e293b',
      bodyColor: '#475569',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      boxPadding: 6,
      usePointStyle: true
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(226, 232, 240, 0.6)',
        drawBorder: false
      },
      border: {
        display: false
      },
      ticks: {
        padding: 10,
        color: '#64748b',
        font: {
          size: 12,
          family: "'Segoe UI', sans-serif"
        }
      }
    },
    x: {
      grid: {
        display: false
      },
      border: {
        display: false
      },
      ticks: {
        padding: 10,
        color: '#64748b',
        font: {
          size: 12,
          family: "'Segoe UI', sans-serif"
        }
      }
    }
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2,
      fill: true
    },
    point: {
      radius: 4,
      hitRadius: 6,
      hoverRadius: 6,
      hoverBorderWidth: 2
    }
  }
};

export const chartColors = {
  primary: '#3b82f6',
  success: '#2ecc71',
  warning: '#f1c40f',
  danger: '#e74c3c',
  info: '#3498db',
  purple: '#9b59b6',
  orange: '#e67e22'
};

export const createGradient = (ctx, color) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, `${color}33`); // 20% opacity
  gradient.addColorStop(1, `${color}00`); // 0% opacity
  return gradient;
}; 