import Board from './components/Board';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Issue Tracker</h1>
      </header>
      <main className="app-main">
        <Board />
      </main>
    </div>
  );
}
