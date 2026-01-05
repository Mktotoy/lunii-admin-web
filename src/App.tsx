import { Shell } from "./components/layout/Shell";
import { state } from "./store";
import { Dashboard } from "./views/Dashboard/Dashboard";
import { StudioView } from "./views/Studio/StudioView";
import { Explorer } from "./views/Explorer/Explorer";
import { Settings } from "./views/Settings/Settings";
import { MusicAlbumView } from "./views/MusicAlbum/MusicAlbumView";
import { UnconnectedApp } from "./components/UnConnectedApp";
import { UnavailableApp } from "./components/UnavailableApp";

function App() {
  const currentTab = state.currentTab.use();
  const luniiHandle = state.luniiHandle.use();

  if (!("showOpenFilePicker" in window)) return <UnavailableApp />;

  const renderContent = () => {
    switch (currentTab) {
      case "dashboard":
        return <Dashboard />;
      case "studio":
        return <StudioView />;
      case "music_album":
        return <MusicAlbumView />;
      case "explorer":
        return luniiHandle ? <Explorer /> : <UnconnectedApp />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Shell>
      {renderContent()}
    </Shell>
  );
}

export default App;
