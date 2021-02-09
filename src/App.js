import React,{Component} from 'react';

class App extends Component {

    state = {

      // Initially, no file is selected
      selectedFile: null
    };

    // On file select (from the pop up)
    onFileChange = event => {

      // Update the state
      this.setState({ selectedFile: event.target.files[0] });

    };

    // On file upload (click the upload button)
    onFileUpload = async () => {

      console.log("onFileUpload");
      // Details of the uploaded file
      console.log(this.state.selectedFile);

      // Request made to the backend api
      // Send formData object

      var fleek = require('@fleekhq/fleek-storage-js');

      const apiKey = 'o7Ay1QRkk7IsC3m2Uub/nQ=='
      const apiSecret = 'kOfTOd005XWUduIgz9bTxVa74FqozEe3Lwzaeo+1Xr0='

      const date = new Date();
      const timestamp = date.getTime();

      const data = this.state.selectedFile;

      const input = {
        apiKey,
        apiSecret,
        key: `file-${timestamp}`,
        data,
      };

      try {
        const result = await fleek.upload(input);
        console.log(result);
      } catch(e) {
        console.log('error', e);
      }

    };

    // File content to be displayed after
    // file upload is complete
    fileData = () => {

      if (this.state.selectedFile) {

        return (
          <div>
            <h2>File Details:</h2>

<p>File Name: {this.state.selectedFile.name}</p>
<p>File Type: {this.state.selectedFile.type}</p>
    </div>
        );
      } else {
        return (
          <div>
            <br />
            <h4>Choose before Pressing the Upload button</h4>
          </div>
        );
      }
    };

    render() {

      return (
        <div>
            <h1>
              GeeksforGeeks
            </h1>
            <h3>
              File Upload using React!
            </h3>
            <div>
                <input type="file" onChange={this.onFileChange} />
                <button onClick={this.onFileUpload}>
                  Upload!
                </button>
            </div>
          {this.fileData()}
        </div>
      );
    }
  }

  export default App;
