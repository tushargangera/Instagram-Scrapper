import axios from "axios";

import React, { Component } from "react";

import * as XLSX from "xlsx";

import exportCSVFile from "./jsonToCSV";

class App extends Component {
  state = {
    // Initially, no file is selected

    hashtag: "",
    request: null,
    isLoading: false,
  };

  processData = (dataString) => {
    const dataStringLines = dataString.split(/\r\n|\n/);
    const headers = dataStringLines[0].split(
      /,(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)/
    );

    const list = [];
    let reqObj = {};
    let usernames = [];
    for (let i = 1; i < dataStringLines.length; i++) {
      const row = dataStringLines[i].split(
        /,(?![^"]*"(?:(?:[^"]*"){2})*[^"]*$)/
      );
      if (row[0] !== "") {
        usernames.push(row[0]);
      }
      if (headers && row.length === headers.length) {
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
          let d = row[j];
          if (d.length > 0) {
            if (d[0] === '"') d = d.substring(1, d.length - 1);
            if (d[d.length - 1] === '"') d = d.substring(d.length - 2, 1);
          }
          if (headers[j]) {
            obj[headers[j]] = d;
          }
        }

        // remove the blank rows
        if (Object.values(obj).filter((x) => x).length > 0) {
          list.push(obj);
        }
      }
    }

    reqObj.users = usernames;
    reqObj.hashtag = this.state.hashtag;

    this.setState({ request: reqObj });
    //console.log(reqObj);
  };

  // On file select (from the pop up)
  onFileChange = (event) => {
    // Update the state
    this.setState({ selectedFile: event.target.files[0] });
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (evt) => {
      /* Parse data */
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      /* Get first worksheet */
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      /* Convert array of arrays */
      const data = XLSX.utils.sheet_to_csv(ws, { header: 1 });
      this.processData(data);
    };
    reader.readAsBinaryString(file);
  };

  // On file upload (click the upload button)
  onFileUpload = (e) => {
    e.preventDefault();
    // Request made to the backend api
    this.setState({ ...this.state, isLoading: true });

    axios.post("http://localhost:3000", this.state.request).then((response) => {
      const values = Object.values(response.data);

      let headers = Object.keys(values[0]);

      console.log(headers);

      let content = values.map((item) => [
        item.id,
        item.edge_followed_by,
        item.edge_follow,
        item.edge_media_preview_like?.count,
        item.edge_media_to_comment?.count,
        item.display_url,
        item.user_link,
      ]);

      exportCSVFile(headers, content, "output");
      //console.log(this.state.isLoading);
      this.setState({ ...this.state, isLoading: false });

      window.location.reload();
    });
  };

  handleInputChange = (event) => {
    let nam = event.target.name;
    let val = event.target.value;
    this.setState({ [nam]: val });
  };

  handleSample = (e) => {
    e.preventDefault();
    let headers_default = ["instagram account links"];
    let content_default = [
      ["https://www.instagram.com/riddheshganatra"],
      ["https://www.instagram.com/isaurabhpawar"],
    ];
    exportCSVFile(headers_default, content_default, "sample");
  };

  render() {
    return (
      <div className="container">
        <form>
          <h1>Instagram Scraper</h1>
          <div className="form-group">
            <label>Hashtag</label>
            <input
              type="text"
              className="form-control"
              name="hashtag"
              onChange={this.handleInputChange}
              placeholder="Enter hashtag"
            />
          </div>
          <div className="form-group">
            <input
              type="file"
              className="form-control-file"
              onChange={this.onFileChange}
              style={{ width: "50%" }}
            />
          </div>

          <div className="form-group">
            <button
              className="form-control-file"
              onClick={this.handleSample}
              style={{ width: "50%" }}
            >
              Sample CSV
            </button>
          </div>

          <button className="btn btn-primary" onClick={this.onFileUpload}>
            {this.state.isLoading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                <span className="sr-only">Loading...</span>
              </>
            ) : (
              <>Submit</>
            )}
          </button>
        </form>
      </div>
    );
  }
}

export default App;
